using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

const string appName = "HJ 资源管理系统";
const int port = 4011;
var url = $"http://localhost:{port}/login";
var adminUrl = $"http://localhost:{port}/login?mode=admin&next=/";
var operatorUrl = $"http://localhost:{port}/login?mode=operator&next=/motors";

Console.OutputEncoding = System.Text.Encoding.UTF8;
Console.Title = appName;

var projectRoot = FindProjectRoot();
var packageJson = Path.Combine(projectRoot, "package.json");
var nodeModules = Path.Combine(projectRoot, "node_modules");
var nextCommand = Path.Combine(projectRoot, "node_modules", ".bin", "next.cmd");
var lanUrls = GetLanUrls(port);

WriteHeader();
Console.WriteLine($"项目目录: {projectRoot}");
Console.WriteLine("电脑访问:");
Console.WriteLine($"  管理端: {adminUrl}");
Console.WriteLine($"  用户端: {operatorUrl}");
if (lanUrls.Count > 0)
{
    Console.WriteLine("手机访问:");
    foreach (var lanUrl in lanUrls)
    {
        Console.WriteLine($"  现场端: {lanUrl}/login?mode=operator&next=/mobile");
    }
}
else
{
    Console.WriteLine("手机访问: 未检测到可用局域网 IP，请确认电脑已连接 Wi-Fi 或网线。");
}
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
    Console.WriteLine($"端口 {port} 已经有服务在运行，正在检查页面是否可访问。");
    if (IsPageReady(url, TimeSpan.FromSeconds(8)).GetAwaiter().GetResult())
    {
        Console.WriteLine("页面可访问，直接打开浏览器。");
        OpenBrowser(url);
        WaitBeforeExit();
        return;
    }

    Console.WriteLine($"端口 {port} 被占用，但页面没有响应，正在清理占用进程。");
    StopPortOwners(port);
    Thread.Sleep(1000);
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
        Fail("启动 Next.js 服务失败。");
        return;
    }

    Console.WriteLine("等待服务就绪...");
    if (WaitForPage(url, TimeSpan.FromSeconds(90), process))
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
        Console.WriteLine("服务还在启动，但 90 秒内页面没有响应。");
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

static bool WaitForPage(string url, TimeSpan timeout, Process process)
{
    var deadline = DateTime.UtcNow + timeout;
    while (DateTime.UtcNow < deadline)
    {
        if (process.HasExited)
        {
            return false;
        }

        if (IsPageReady(url, TimeSpan.FromSeconds(3)).GetAwaiter().GetResult())
        {
            return true;
        }

        Thread.Sleep(500);
    }

    return false;
}

static async Task<bool> IsPageReady(string url, TimeSpan timeout)
{
    try
    {
        using var client = new HttpClient
        {
            Timeout = timeout
        };
        using var response = await client.GetAsync(url);
        return (int)response.StatusCode < 500;
    }
    catch
    {
        return false;
    }
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

static void StopPortOwners(int port)
{
    foreach (var pid in GetPortOwnerPids(port))
    {
        try
        {
            Console.WriteLine($"正在关闭占用端口 {port} 的进程 PID {pid}。");
            using var process = Process.Start(new ProcessStartInfo
            {
                FileName = "taskkill.exe",
                Arguments = $"/PID {pid} /T /F",
                UseShellExecute = false,
                CreateNoWindow = true
            });
            process?.WaitForExit(5000);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"关闭 PID {pid} 失败: {ex.Message}");
        }
    }
}

static IReadOnlyList<int> GetPortOwnerPids(int port)
{
    try
    {
        using var process = Process.Start(new ProcessStartInfo
        {
            FileName = "netstat.exe",
            Arguments = "-ano -p tcp",
            UseShellExecute = false,
            RedirectStandardOutput = true,
            CreateNoWindow = true
        });
        if (process == null)
        {
            return Array.Empty<int>();
        }

        var output = process.StandardOutput.ReadToEnd();
        process.WaitForExit(5000);
        var pids = new HashSet<int>();

        foreach (var line in output.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries))
        {
            var columns = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (columns.Length < 5)
            {
                continue;
            }

            var localAddress = columns[1];
            var state = columns[3];
            if (!state.Equals("LISTENING", StringComparison.OrdinalIgnoreCase) ||
                !localAddress.EndsWith($":{port}", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (int.TryParse(columns[4], out var pid))
            {
                pids.Add(pid);
            }
        }

        return pids.ToArray();
    }
    catch
    {
        return Array.Empty<int>();
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

static IReadOnlyList<string> GetLanUrls(int port)
{
    var urls = new List<string>();
    var ignoredNames = new[] { "VMware", "VirtualBox", "Hyper-V", "Loopback", "Teredo" };

    foreach (var adapter in NetworkInterface.GetAllNetworkInterfaces())
    {
        if (adapter.OperationalStatus != OperationalStatus.Up ||
            adapter.NetworkInterfaceType is NetworkInterfaceType.Loopback or NetworkInterfaceType.Tunnel ||
            ignoredNames.Any(name => adapter.Name.Contains(name, StringComparison.OrdinalIgnoreCase) ||
                                     adapter.Description.Contains(name, StringComparison.OrdinalIgnoreCase)))
        {
            continue;
        }

        foreach (var address in adapter.GetIPProperties().UnicastAddresses)
        {
            if (address.Address.AddressFamily != AddressFamily.InterNetwork ||
                IPAddress.IsLoopback(address.Address))
            {
                continue;
            }

            var ip = address.Address.ToString();
            if (ip.StartsWith("169.254.", StringComparison.Ordinal))
            {
                continue;
            }

            urls.Add($"http://{ip}:{port}");
        }
    }

    return urls.Distinct().ToArray();
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
