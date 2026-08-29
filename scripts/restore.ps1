Add-Type -MemberDefinition @'
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
'@ -Name Win -Namespace Native

$hwnd = [IntPtr]1364364  # 占位，由参数替换
