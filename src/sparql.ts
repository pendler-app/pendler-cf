export type WikiDataEntry = {
  itemLabel: {
    value: string;
  };
  lat: {
    value: string;
  };
  long: {
    value: string;
  };
};

export type WikiData = {
  results: {
    bindings: WikiDataEntry[];
  };
};

export class SPARQLQueryDispatcher {
  endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async query(sparqlQuery: string) {
    const fullUrl = this.endpoint + "?query=" + encodeURIComponent(sparqlQuery);
    const headers = {
      Accept: "application/sparql-results+json",
      "User-Agent": "Pendler.dk",
    };

    return fetch(fullUrl, { headers }).then(async (body) => {
      const data: WikiData = await body.json();
      return data;
    });
  }
}
