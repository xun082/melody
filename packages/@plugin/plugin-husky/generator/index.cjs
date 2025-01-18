const path = require("path");
const fs = require("fs");

function fileRender(files) {
  try {
    const outputDir = path.join(__dirname, "template");
    Object.entries(files).forEach(([filePath, content]) => {
      const fullPath = path.join(outputDir, filePath);
      fs.ensureFileSync(fullPath);
      fs.writeFileSync(fullPath, content, "utf-8");
    });
  } catch (error) {
    console.log("文件渲染失败: ", error);
  }
}

const basicConfig = (preset) => {
  return {
    scripts: {
      postinstall: "husky install",
      "commit-msg": "commitlint --edit $1",
    },
    "lint-staged": {
      "*.{ts,tsx,js,jsx}": [`${preset} format:ci`, `${preset} lint:ci`],
    },
    devDependencies: {
      husky: "^9.0.11",
      "lint-staged": "^15.2.0",
      "@commitlint/cli": "^18.4.3",
      "@commitlint/config-conventional": "^18.4.3",
    },
  }
};

const generateBasicConfig = (generatorAPI, preset) => {
  generatorAPI.extendPackage(basicConfig(preset));
  const files = {
    ".commitlintrc.js": `module.exports = {
      extends: ["@commitlint/config-conventional"]
    }`,
  };
  fileRender(files);
};

const generateStrictConfig = (generatorAPI, preset) => {
  const res = basicConfig(preset);
  generatorAPI.extendPackage({
    ...res,
    scripts: {
      ...res.scripts,
      "pre-commit": `lint-staged && ${preset} run test`,
    },
    "lint-staged": {
      ...res["lint-staged"],
      "*.{css,scss,less}": [`${preset} stylelint`],
    },
    devDependencies: {
      ...res.devDependencies,
      stylelint: "^15.10.0",
    },
  });
  const files = {
    ".commitlintrc.js": `module.exports ={
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
    }`,
  };
  fileRender(files);
};

const configs = {
  basic: generateBasicConfig,
  strict: generateStrictConfig,
};

module.exports = (generatorAPI, curPreset, configType = "basic") => {
  const generator = configs[configType];
  const preset = JSON.parse(curPreset);
  if (!generator) {
    console.warn(`不支持的配置类型：${configType}`);
    return configs.basic(generatorAPI, preset);
  }
  return generator(generatorAPI);
};
