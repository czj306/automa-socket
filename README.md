## 服务配置：文件上传OSS使用说明

### `Chrome` 插件`Automa`导入`Station`、`SetTimeUploadOBS`、`AutoRefresh`

- 在`hub`项目下载相关文件项目
- 导入`Automa`配置包`(.json)`
- 随之正常操作`Automa`，达到下载文件并通知后端服务
- 定时服务：`SetTimeUploadOBS`
- 浏览器启动服务：`AutoRefresh`

### `Socket`服务启动配置

- 使用nodejs启动服务

  ```bash
  # 安装node
  npm install -g node
  # 启动服务
  node socket_upload.js
  ```

- 使用`forever`实现永久启动服务

  ```bash
  # 安装forever
  npm install -g forever
  # 永久启动服务
  forever start socket_upload.js
  # 重启服务
  forever restart socket_upload.js
  # 重启所有服务
  forever restartall
  # 关闭所有服务
  forever stopall
  ```
  
  

