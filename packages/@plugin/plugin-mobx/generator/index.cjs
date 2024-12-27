const protocol = require("../../../core/src/configs/protocol.ts");
const pluginToTemplateProtocol = protocol.pluginToTemplateProtocol;

module.exports = (generatorAPI) => {
  generatorAPI.extendPackage({
    devDependencies: {
      mobx: "^6.6.4",
      "mobx-react-lite": "^3.2.2",
    },
  });

  generatorAPI.protocolGenerate({
    [pluginToTemplateProtocol.INSERT_IMPORT_PROTOCOL]: {
      params: {
        imports: [
          {
            dir: "src/App",
            modules: [
              {
                name: "mobx",
                from: "mobx-react-lite",
              },
              {
                name: "store",
                from: "./store",
              }
            ]
          }
        ],
        astOptions: {
          parserOptions: { sourceType: "module", plugins: ["typescript", "jsx"] }
        }
      },
    },
    [pluginToTemplateProtocol.UPDATE_EXPORT_CONTENT_PROTOCOL]: {
      params: {
        url: 'src/App',
        exportContent: 'Observer',
        astOptions: {
          parserOptions: { sourceType: "module", plugins: ["typescript", "jsx"] }
        }
      },
    },
  });
};
