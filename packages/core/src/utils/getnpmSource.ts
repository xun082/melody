import https from "https";

import { npmRegistries, type Source, type RegistryInfo } from "../configs/npmRegistries";

/**
 * 获取 npm 源以及最快的 npm 源。
 * @function getNpmSource
 * @returns {Array<{ label: string, value: string }>} 包含所有 npm 源及最快 npm 源的数组。
 */
export const getNpmSource = () => {
  const npmSources = [];

  for (const key in npmRegistries) {
    npmSources.push({ label: key, value: npmRegistries[key].registry });
  }
  /**
   * 检查源的响应速度。
   * @param {RegistryInfo} source - 要检查的源信息。
   * @returns {Promise<Source>} 包含源名称和响应速度的对象。
   */
  const checkSourceSpeed = (source: RegistryInfo): Promise<Source> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const req = https.request(source.registry, () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        resolve({ sourceName: source, duration });
      });
      req.on("error", (error) => {
        reject(error);
      });

      req.end();
    });
  };

  (async () => {
    try {
      // 为每个源创建 Promise
      const promises = Object.keys(npmRegistries).map((sourceName) => {
        const source = npmRegistries[sourceName];
        return checkSourceSpeed(source);
      });

      // 使用 Promise.race 找出哪个源最快，并用 await 等待结果
      const fastestSource: Source = await Promise.race(promises);

      // 找到最快源对应的名称
      const fastestName =
        Object.keys(npmRegistries).find(
          (name) => npmRegistries[name].registry === fastestSource.sourceName.registry,
        ) || "";

      // 将最快源添加到数组开头
      if (fastestName) {
        npmSources.unshift({
          label: `Fastest source (${fastestName})`,
          value: fastestSource.sourceName.registry,
        });
      }
    } catch (error) {
      console.error("检测源速度时发生错误:", error);
    }
  })();
  return npmSources;
};
