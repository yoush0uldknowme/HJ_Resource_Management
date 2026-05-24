using System.Diagnostics;
using System.Net.Sockets;

const string appName = "HJ 资源管理系统";
const int port = 4011;
var url = $"http://localhost:{port}/login";

Console.OutputEncoding = System.Text.Encoding.UTF8;
Console.Title = appName;

var projectRoot = FindProjectRoot();
var packageJson = Path.Combine(projectRoot, "package.json");
var nodeModules = Path.Combine(projectRoot, "node_modules");
var nextCommand = Path.Combine(projectRoot, "node_modules", ".bin", "next.cmd");

WriteHeader();
Console.WriteLine($"项目目录: {projectRoot}");
Console.WriteLine($"访问地址: {url}");
Console.WriteLine();

if (!File.Exists(packageJson))
{
    Fail("没有找到 package.json。请把启动器放在项目 tools 目录下，或从项目目录运行。");
}

if (!Directory.Exists(nodeModules))
{
    Fail("没有找到 node_modules。请先在项目目录运行 npm install。");
}

if (!File.Exists(nextCommand))
{
    Fail("没有找到 node_modules\\.bin\\next.cmd。请先在项目目录运行 npm install。");
}

if (IsPortOpen("127.0.0.1", port))
{
    Console.WriteLine($"端口 {port} 已经有服务在运行，直接打开浏览器。");
    OpenBrowser(url);
    WaitBeforeExit();
    return;
}

Console.WriteLine("正在启动服务...");
Console.WriteLine("服务启动需要几秒钟，请不要关闭这个窗口。");
Console.WriteLine("关闭这个窗口会同时结束服务。");
Console.WriteLine();

var startInfo = new ProcessStartInfo
{
    FileName = nextCommand,
    Arguments = "dev --hostname 0.0.0.0 --port 4011",
    WorkingDirectory = projectRoot,
    UseShellExecute = false,
    RedirectStandardOutput = false,
    RedirectStandardError = false
};

try
{
    using var process = Process.Start(startInfo);
    if (process == null)
    {
        Fail("启动 npm run dev 失败。");
        return;
    }

    Console.WriteLine("等待服务就绪...");
    if (WaitForPort("127.0.0.1", port, TimeSpan.FromSeconds(45), process))
    {
        Console.WriteLine("服务已启动，正在打开浏览器。");
        OpenBrowser(url);
    }
    else if (process.HasExited)
    {
        Fail($"服务启动后立即退出，退出码: {process.ExitCode}。请查看上方 npm 日志。");
    }
    else
    {
        Console.WriteLine("服务还在启动，但 45 秒内没有检测到端口。");
        Console.WriteLine($"请稍后手动访问 {url}");
    }

    process.WaitForExit();
}
catch (Exception ex)
{
    Fail($"启动失败: {ex.Message}");
}

static string FindProjectRoot()
{
    var current = AppContext.BaseDirectory;
    for (var i = 0; i < 8; i++)
    {
        var parts = Enumerable.Repeat("..", i).ToArray();
        var candidate = Path.GetFullPath(Path.Combine(new[] { current }.Concat(parts).ToArray()));
        if (File.Exists(Path.Combine(candidate, "package.json")) && Directory.Exists(Path.Combine(candidate, "src")))
        {
            return candidate;
        }
    }

    return @"D:\github\HJ_Resource_Management";
}

static bool WaitForPort(string host, int port, TimeSpan timeout, Process process)
{
    var deadline = DateTime.UtcNow + timeout;
    while (DateTime.UtcNow < deadline)
    {
        if (process.HasExited)
        {
            return false;
        }

        if (IsPortOpen(host, port))
        {
            return true;
        }

        Thread.Sleep(500);
    }

    return false;
}

static bool IsPortOpen(string host, int port)
{
    try
    {
        using var client = new TcpClient();
        var task = client.ConnectAsync(host, port);
        return task.Wait(TimeSpan.FromMilliseconds(500)) && client.Connected;
    }
    catch
    {
        return false;
    }
}

static void OpenBrowser(string url)
{
    try
    {
        var chromePath = FindChromePath();
        if (chromePath != null)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = chromePath,
                Arguments = url,
                UseShellExecute = false
            });
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = url,
            UseShellExecute = true
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"浏览器打开失败，请手动访问 {url}");
        Console.WriteLine(ex.Message);
    }
}

static string? FindChromePath()
{
    var candidates = new[]
    {
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe")
    };

    return candidates.FirstOrDefault(File.Exists);
}

static void WriteHeader()
{
    Console.WriteLine("========================================");
    Console.WriteLine(" HJ 资源管理系统启动器");
    Console.WriteLine("========================================");
    Console.WriteLine();
}

static void Fail(string message)
{
    Console.WriteLine(message);
    WaitBeforeExit();
    Environment.Exit(1);
}

static void WaitBeforeExit()
{
    Console.WriteLine();
    Console.WriteLine("按任意键关闭窗口...");
    Console.ReadKey(intercept: true);
}
