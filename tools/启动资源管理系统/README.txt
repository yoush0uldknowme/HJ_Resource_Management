使用方法：

1. 双击“启动资源管理系统.exe”。
2. 程序会自动进入 D:\github\HJ_Resource_Management 并启动 Next.js 服务。
3. 程序会显示管理端、用户端和手机现场端地址；手机现场端地址会按当前局域网 IP 自动生成。
4. 程序会等待 4011 服务启动完成，然后优先用 Google Chrome 打开入口选择页。
5. 不要单独移动 exe；同目录下的 HJResourceLauncher.dll、deps.json、runtimeconfig.json 需要一起保留。
6. 关闭启动器窗口会结束服务。

如果提示没有 node_modules，请先在项目目录运行 npm install。
