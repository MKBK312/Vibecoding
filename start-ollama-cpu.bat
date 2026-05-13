@echo off
REM Disable CUDA by clearing visible devices (empty = no GPUs)
set CUDA_VISIBLE_DEVICES=
REM Alternative: reserve all VRAM so GPU is not used
set OLLAMA_GPU_OVERHEAD=9999999999
set OLLAMA_MAX_LOADED_MODELS=1
set OLLAMA_NUM_PARALLEL=1
set OLLAMA_HOST=127.0.0.1:11434
set OLLAMA_MODELS=E:\COLIN\vibecoding\Ollama

echo =============================================
echo   MindLink Ollama (CPU-only mode)
echo =============================================
echo CUDA_VISIBLE_DEVICES = [empty - CUDA disabled]
echo OLLAMA_GPU_OVERHEAD  = 9999999999
echo OLLAMA_MAX_LOADED_MODELS = 1
echo OLLAMA_NUM_PARALLEL = 1
echo OLLAMA_MODELS = %OLLAMA_MODELS%
echo.

start "Ollama-CPU" "E:\Ollama\ollama.exe" serve
echo Server starting...
echo.
echo Close this window after the Ollama icon appears in the system tray.
pause >nul
