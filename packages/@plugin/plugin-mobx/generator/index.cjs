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
                name: "{ observer }",
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
        exportContent: 'observer',
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
            slotName: 'store-slot',
            slotContent: "console.log('当前store的number值为: ', store.number);", // 提示用户store的number值生效
          }
        ]
      },
    }
  });
};
