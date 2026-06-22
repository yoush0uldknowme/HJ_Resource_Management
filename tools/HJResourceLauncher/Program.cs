using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;

const string AppName = "HJ 资源管理系统";
const int Port = 4011;

Console.OutputEncoding = System.Text.Encoding.UTF8;
Console.Title = $"{AppName} - 启动器";

var projectRoot = FindProjectRoot();
var packageJson = Path.Combine(projectRoot, "package.json");
var nodeModules = Path.Combine(projectRoot, "node_modules");
var lanUrls = GetLanUrls(Port);

// ── 显示网址信息 ──
WriteHeader();
Console.WriteLine($"  项目目录 : {projectRoot}");
Console.WriteLine();
Console.WriteLine("  ─── 电脑访问 ───");
Console.WriteLine($"  管理端   : https://localhost:{Port}/admin");
Console.WriteLine($"  用户端   : https://localhost:{Port}/user");
Console.WriteLine();

if (lanUrls.Count > 0)
{
    Console.WriteLine("  ─── 手机访问 (HTTPS) ───");
    foreach (var lanUrl in lanUrls)
    {
        Console.WriteLine($"  现场入口 : {lanUrl}/mobile");
        Console.WriteLine($"  登录页   : {lanUrl}/login");
    }
    Console.WriteLine();
    Console.WriteLine("  ⚠ 手机首次访问需点击「高级 → 继续前往」（自签名证书）");
}
else
{
    Console.WriteLine("  ─── 手机访问 ───");
    Console.WriteLine("  未检测到可用局域网 IP，请确认电脑已联网。");
}
Console.WriteLine();
Console.WriteLine("══════════════════════════════════════════════════");
Console.WriteLine();

// ── 环境检查 ──
if (!File.Exists(packageJson))
    Fail("没有找到 package.json，请确认启动器位于项目 tools 目录下。");

if (!Directory.Exists(nodeModules))
    Fail("没有找到 node_modules，请先在项目目录执行 npm install。");

// 查找 node.exe
var nodeExe = "node.exe";
var localNode = Path.Combine(projectRoot, "node_modules", ".bin", "node.exe");
if (File.Exists(localNode))
    nodeExe = localNode;

// ── 端口检测 ──
if (IsPortOpen("127.0.0.1", Port))
{
    Console.WriteLine($"端口 {Port} 已被占用，正在检查...");
    if (IsPageReady($"https://localhost:{Port}/", TimeSpan.FromSeconds(5)).GetAwaiter().GetResult())
    {
        Console.WriteLine("服务已在运行，直接打开浏览器。");
        OpenBrowser($"https://localhost:{Port}/");
        WaitBeforeExit();
        return;
    }
    Console.WriteLine($"端口被占用但无响应，正在清理...");
    StopPortOwners(Port);
    Thread.Sleep(1000);
}

// ── 启动服务 ──
Console.WriteLine("正在启动 HTTPS 服务...");
Console.WriteLine("服务日志将显示在独立窗口中。");
Console.WriteLine("关闭本窗口会同时结束服务。");
Console.WriteLine();

// 方式：调用项目内的 scripts/run-server.bat，它会在新窗口中启动 node server.mjs
// 把启动逻辑放在 .bat 文件里，避免 cmd 引号嵌套问题
var runServerBat = Path.Combine(projectRoot, "scripts", "run-server.bat");
if (!File.Exists(runServerBat))
    Fail($"没有找到 {runServerBat}，请确认项目结构完整。");

var serverProcess = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = runServerBat,
        UseShellExecute = true,
        CreateNoWindow = false,
        WindowStyle = ProcessWindowStyle.Normal
    },
    EnableRaisingEvents = true
};

try
{
    serverProcess.Start();
    Console.WriteLine("已启动服务日志窗口");
    Console.WriteLine();

    // 等待服务就绪
    Console.Write("等待服务就绪");
    var deadline = DateTime.UtcNow + TimeSpan.FromSeconds(120);
    var ready = false;
    var dots = 0;

    while (DateTime.UtcNow < deadline)
    {
        if (IsPageReady($"https://localhost:{Port}/", TimeSpan.FromSeconds(2)).GetAwaiter().GetResult())
        {
            ready = true;
            break;
        }

        // 检查日志窗口是否被关闭
        if (serverProcess.HasExited)
        {
            Console.WriteLine();
            Fail("服务日志窗口已关闭，服务可能启动失败。请查看窗口中的错误信息。");
            return;
        }

        Console.Write(".");
        dots++;
        if (dots % 60 == 0)
        {
            Console.WriteLine();
            Console.Write("  ");
        }
        Thread.Sleep(500);
    }

    Console.WriteLine();

    if (ready)
    {
        Console.WriteLine();
        Console.WriteLine("══════════════════════════════════════════════════");
        Console.WriteLine("  服务启动成功！");
        Console.WriteLine("══════════════════════════════════════════════════");
        Console.WriteLine();
        Console.WriteLine("  正在打开浏览器...");
        OpenBrowser($"https://localhost:{Port}/");
        Console.WriteLine();
        Console.WriteLine("  ─── 快速访问 ───");
        Console.WriteLine($"  管理端 : https://localhost:{Port}/admin");
        Console.WriteLine($"  用户端 : https://localhost:{Port}/user");
        if (lanUrls.Count > 0)
        {
            foreach (var u in lanUrls)
                Console.WriteLine($"  手机端 : {u}/mobile");
        }
        Console.WriteLine();
        Console.WriteLine("══════════════════════════════════════════════════");
        Console.WriteLine();
        Console.WriteLine("服务正在运行。");
        Console.WriteLine("  • 服务日志请查看「服务日志」窗口");
        Console.WriteLine("  • 关闭本窗口会自动停止服务");
        Console.WriteLine();

        // serverProcess 是 cmd.exe，关闭它需要 kill 整个进程树（包括 node.exe）
        Console.WriteLine("按任意键停止服务并退出...");
        Console.ReadKey(intercept: true);
        Console.WriteLine("正在停止服务...");
        // 先通过端口清理 node.exe
        StopPortOwners(Port);
        // 再关闭 cmd 窗口
        try
        {
            if (!serverProcess.HasExited)
            {
                // taskkill /T 会终止进程及其所有子进程
                using var tk = Process.Start(new ProcessStartInfo
                {
                    FileName = "taskkill.exe",
                    Arguments = $"/PID {serverProcess.Id} /T /F",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                tk?.WaitForExit(5000);
            }
        }
        catch { }
        Console.WriteLine("服务已停止。");
    }
    else
    {
        Console.WriteLine();
        Console.WriteLine("⚠ 服务在 120 秒内未响应。");
        Console.WriteLine($"请查看「服务日志」窗口，或手动访问 https://localhost:{Port}/");
        Console.WriteLine();
        Console.WriteLine("按任意键停止服务并退出...");
        Console.ReadKey(intercept: true);
        StopPortOwners(Port);
        try
        {
            if (!serverProcess.HasExited)
            {
                using var tk = Process.Start(new ProcessStartInfo
                {
                    FileName = "taskkill.exe",
                    Arguments = $"/PID {serverProcess.Id} /T /F",
                    UseShellExecute = false,
                    CreateNoWindow = true
                });
                tk?.WaitForExit(5000);
            }
        }
        catch { }
    }
}
catch (Exception ex)
{
    Fail($"启动失败: {ex.Message}");
}

// ═══════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════

static string FindProjectRoot()
{
    var current = AppContext.BaseDirectory;
    for (var i = 0; i < 8; i++)
    {
        var parts = Enumerable.Repeat("..", i).ToArray();
        var candidate = Path.GetFullPath(Path.Combine(new[] { current }.Concat(parts).ToArray()));
        if (File.Exists(Path.Combine(candidate, "package.json"))
            && Directory.Exists(Path.Combine(candidate, "src")))
        {
            return candidate;
        }
    }
    return @"D:\github\HJ_Resource_Management";
}

static async Task<bool> IsPageReady(string url, TimeSpan timeout)
{
    // 优先用 TCP 端口检测，比 HTTPS 请求更可靠（避开 SSL 握手问题）
    if (IsPortOpen("127.0.0.1", Port))
        return true;
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
        Console.WriteLine($"浏览器打开失败: {ex.Message}");
        Console.WriteLine($"请手动访问: {url}");
    }
}

static string? FindChromePath()
{
    var candidates = new[]
    {
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            "Google", "Chrome", "Application", "chrome.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            "Google", "Chrome", "Application", "chrome.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Google", "Chrome", "Application", "chrome.exe")
    };
    return candidates.FirstOrDefault(File.Exists);
}

static void StopPortOwners(int port)
{
    foreach (var pid in GetPortOwnerPids(port))
    {
        try
        {
            Console.WriteLine($"正在终止进程 PID {pid}...");
            using var p = Process.Start(new ProcessStartInfo
            {
                FileName = "taskkill.exe",
                Arguments = $"/PID {pid} /T /F",
                UseShellExecute = false,
                CreateNoWindow = true
            });
            p?.WaitForExit(5000);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"终止 PID {pid} 失败: {ex.Message}");
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
        if (process == null) return Array.Empty<int>();

        var output = process.StandardOutput.ReadToEnd();
        process.WaitForExit(5000);
        var pids = new HashSet<int>();

        foreach (var line in output.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries))
        {
            var columns = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (columns.Length < 5) continue;
            if (!columns[3].Equals("LISTENING", StringComparison.OrdinalIgnoreCase)) continue;
            if (!columns[1].EndsWith($":{port}", StringComparison.OrdinalIgnoreCase)) continue;
            if (int.TryParse(columns[4], out var pid))
                pids.Add(pid);
        }
        return pids.ToArray();
    }
    catch
    {
        return Array.Empty<int>();
    }
}

static IReadOnlyList<string> GetLanUrls(int port)
{
    var urls = new List<string>();
    var ignored = new[] { "VMware", "VirtualBox", "Hyper-V", "Loopback", "Teredo", "WSL" };

    foreach (var adapter in NetworkInterface.GetAllNetworkInterfaces())
    {
        if (adapter.OperationalStatus != OperationalStatus.Up ||
            adapter.NetworkInterfaceType is NetworkInterfaceType.Loopback or NetworkInterfaceType.Tunnel ||
            ignored.Any(n => adapter.Name.Contains(n, StringComparison.OrdinalIgnoreCase)
                          || adapter.Description.Contains(n, StringComparison.OrdinalIgnoreCase)))
            continue;

        foreach (var addr in adapter.GetIPProperties().UnicastAddresses)
        {
            if (addr.Address.AddressFamily != AddressFamily.InterNetwork
                || IPAddress.IsLoopback(addr.Address)
                || addr.Address.ToString().StartsWith("169.254.", StringComparison.Ordinal))
                continue;

            urls.Add($"https://{addr.Address}:{port}");
        }
    }
    return urls.Distinct().ToArray();
}

static void WriteHeader()
{
    Console.WriteLine();
    Console.WriteLine("╔══════════════════════════════════════════════════╗");
    Console.WriteLine("║        HJ 资源管理系统 - 启动器 v2.0            ║");
    Console.WriteLine("╚══════════════════════════════════════════════════╝");
    Console.WriteLine();
}

static void Fail(string message)
{
    Console.WriteLine();
    Console.WriteLine($"错误: {message}");
    WaitBeforeExit();
    Environment.Exit(1);
}

static void WaitBeforeExit()
{
    Console.WriteLine();
    Console.WriteLine("按任意键关闭窗口...");
    Console.ReadKey(intercept: true);
}
