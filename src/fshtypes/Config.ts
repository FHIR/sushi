// Config follows the package.json format defined for FSH
// See: https://github.com/HL7/fhir-shorthand/wiki/1.1-Configuration-File
export type Config = {
  name: string;
  version: string;
  canonical: string;
  url?: string;
  title?: string;
  description?: string;
  dependencies?: {
    [key: string]: string;
  };
  keywords?: string[];
  language?: string;
  author?: string;
  maintainers?: [
    {
      name: string;
      email: string;
    }
  ];
  license?: string;
};
