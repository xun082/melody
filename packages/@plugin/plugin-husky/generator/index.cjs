const path = require('path');
const fs = require('fs');

function fileRender(files) {
  try {
    const outputDir = path.join(__dirname, 'template');
    Object.entries(files).forEach(([filePath, content]) => {
      const fullPath = path.join(outputDir, filePath);
      fs.ensureFileSync(fullPath);
      fs.writeFileSync(fullPath, content, 'utf-8');
    });
  } catch (error) {
    console.log('文件渲染失败: ', error);
  }
}

const basicConfig = {
  scripts: {
    prepare: "husky install",
    "commit-msg": "commitlint --edit $1",
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["pnpm format:ci", "pnpm lint:ci"],
  },
  devDependencies: {
    husky: "^9.0.11",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^18.4.3",
    "@commitlint/config-conventional": "^18.4.3",
  },
}

const generateBasicConfig = (generatorAPI) => {
  generatorAPI.extendPackage(basicConfig);
  generatorAPI.protocolGenerate({
    [pluginToTemplateProtocol.RENDER_FILE]: {
      params: {
        files: {
          '.commitlintrc.js': `module.exports = {
            extends: ["@commitlint/config-conventional"]
          }`,
        },
        content: {
          fileRender
        }
      },
    },
  });
};

const generateStrictConfig = (generatorAPI) => {
  generatorAPI.extendPackage({
    ...basicConfig,
    scripts: {
      ...basicConfig.scripts,
      "pre-commit": "lint-staged && npm run test",
    },
    "lint-staged": {
      ...basicConfig["lint-staged"],
      "*.{css,scss,less}": ["pnpm stylelint"],
    },
    devDependencies: {
      ...basicConfig.devDependencies,
      "stylelint": "^15.10.0",
    },
  });
  generatorAPI.protocolGenerate({
    [pluginToTemplateProtocol.RENDER_FILE]: {
      params: {
        files: {
          '.commitlintrc.js': `module.exports ={
            extends:["@commitlint/config-conventional"],
            rules:{
              'body-max-line-length':[2,'always',100],
              'subject-case':[2,'always','lower-case'],
              'type-enum':[
                2,
                'always',
                ['feat','fix','docs','style','refactor','perf','test','chore','revert']
              ]
            }
          }`
        },
        content: {
          fileRender
        }
      },
    },
  });
};

const configs = {
  basic: generateBasicConfig,
  strict: generateStrictConfig,
};

module.exports = (generatorAPI, configType = "basic") => {
  const generator = configs[configType];
  if (!generator) {
    console.warn(`不支持的配置类型：${configType}`);
    return configs.basic(generatorAPI);
  }
  return generator(generatorAPI);
};