使用方法：

1. 双击“启动资源管理系统.exe”。
2. 程序会自动进入 D:\github\HJ_Resource_Management 并启动 Next.js 服务。
3. 程序会等待 4011 服务启动完成，然后优先用 Google Chrome 打开 http://localhost:4011/login。
4. 不要单独移动 exe；同目录下的 HJResourceLauncher.dll、deps.json、runtimeconfig.json 需要一起保留。
5. 关闭启动器窗口会结束服务。

如果提示没有 node_modules，请先在项目目录运行 npm install。
