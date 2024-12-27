const protocol = require("../../../core/src/configs/protocol.ts");
const pluginToTemplateProtocol = protocol.pluginToTemplateProtocol;

module.exports = (generatorAPI) => {
  generatorAPI.extendPackage({
    dependencies: {
      pinia: "^2.2.2",
    },
  });

  generatorAPI.protocolGenerate({
    [pluginToTemplateProtocol.INSERT_IMPORT_PROTOCOL]: {
      params: {
        imports: [
          {
            dir: "src/main",
            modules: [
              {
                name: "{ createPinia }",
                from: "pinia",
              }
            ]
          },
        ],
        astOptions: {
          parserOptions: { sourceType: "module", plugins: ["typescript"] }
        }
      },
    },
  });
};
