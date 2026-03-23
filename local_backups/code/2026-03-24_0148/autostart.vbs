' ===== Auto-start NVKD Server (lightweight) =====
' Waits 60 seconds after login before starting the server
' to avoid competing with other startup programs.
' Runs silently with no visible window.

' Wait 60 seconds to let Windows finish loading
WScript.Sleep 60000

Set WshShell = CreateObject("WScript.Shell")

' Start the server with Below Normal priority, no visible window
' /B = no new window, /LOW = below normal priority
WshShell.CurrentDirectory = "D:\0 - Google Antigravity\11 - NHAN VIEN KINH DOANH"
WshShell.Run "cmd /c node server.js", 0, False

Set WshShell = Nothing
