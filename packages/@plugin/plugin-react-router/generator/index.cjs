const protocol = require("../../../core/src/configs/protocol.ts");
const pluginToTemplateProtocol = protocol.pluginToTemplateProtocol;

module.exports = (generatorAPI) => {
  generatorAPI.extendPackage({
    dependencies: {
      "react-router-dom": "^6.0.0",
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
                name: "{ BrowserRouter as Router, Switch, Route }",
                from: "react-router-dom",
              }
            ]
          },
        ],
        astOptions: {
          parserOptions: { sourceType: "module", plugins: ["typescript", "jsx"] }
        }
      },
    },
    [pluginToTemplateProtocol.SLOT_CONTENT_PROTOCOL]: {
      params: {
        slotConfig: [
          {
            url: 'src/App',
            slotName: 'router-start-slot',
            slotContent: "<Router>",
          },
          {
            url: 'src/App',
            slotName: 'router-end-slot',
            slotContent: "</Router>",
          }
        ]
      },
    },
  });
};
