'use strict'

var obj = require("./hpo.json");
const axios = require('axios')

function emptyHpo(hpo) {
  return {
    id: hpo,
    name: "",
    synonym: "",
    comment: "",
    xref: "",
    relatives: {
      parents: [],
      children: []
    }
  };
}

function buildHpoFromMonarch(hpo, body) {
  if (!body.nodes || body.nodes.length === 0) {
    return emptyHpo(hpo);
  }

  var comment = '';
  var synonym = '';
  var node = body.nodes[0];

  if (node.meta.definition != undefined) {
    comment = node.meta.definition[0];
  } else if (node.meta["http://www.w3.org/2000/01/rdf-schema#comment"] != undefined) {
    comment = node.meta["http://www.w3.org/2000/01/rdf-schema#comment"][0];
  }
  if (node.meta.synonym != undefined) {
    synonym = node.meta.synonym;
  }

  return {
    id: hpo,
    name: node.lbl,
    synonym: synonym,
    comment: comment,
    xref: "",
    relatives: {
      parents: [],
      children: []
    }
  };
}

async function fetchMonarchHpo(hpo) {
  try {
    var response = await axios.get(
      'https://scigraph-ontology.monarchinitiative.org/scigraph/dynamic/cliqueLeader/' + hpo + '.json'
    );
    return { info: buildHpoFromMonarch(hpo, response.data), error: false };
  } catch (error) {
    return { info: emptyHpo(hpo), error: true };
  }
}

async function getHposInfo(req, res) {
  var arrayHpos = req.query.symtomCodes;
  var isarray = Array.isArray(arrayHpos);

  if (!isarray) {
    return res.status(200).send([obj[arrayHpos]]);
  }

  var outcomes = await Promise.all(
    arrayHpos.map(async function (hpo) {
      if (obj[hpo] == undefined || obj[hpo].comment == undefined || obj[hpo].def == undefined) {
        return fetchMonarchHpo(hpo);
      }
      return { info: obj[hpo], error: false };
    })
  );

  var hasError = outcomes.some(function (outcome) { return outcome.error; });
  var listhposinfo = outcomes.map(function (outcome) { return outcome.info; });

  if (hasError) {
    return res.status(500).send({ message: 'Error monarch' });
  }
  return res.status(200).send(listhposinfo);
}

module.exports = {
  getHposInfo
}
