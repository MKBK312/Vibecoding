@echo off
echo Setting Ollama environment variables...

REM Set OLLAMA_MODELS to E drive
reg add HKCU\Environment /v OLLAMA_MODELS /t REG_SZ /d "E:\COLIN\vibecoding\Ollama" /f
echo [OK] OLLAMA_MODELS = E:\COLIN\vibecoding\Ollama

REM Set OLLAMA_HOST
reg add HKCU\Environment /v OLLAMA_HOST /t REG_SZ /d "http://127.0.0.1:11434" /f
echo [OK] OLLAMA_HOST = http://127.0.0.1:11434

REM Limit GPU memory usage — prevent CUDA OOM on 8GB VRAM
reg add HKCU\Environment /v OLLAMA_MAX_LOADED_MODELS /t REG_SZ /d "1" /f
echo [OK] OLLAMA_MAX_LOADED_MODELS = 1

reg add HKCU\Environment /v OLLAMA_NUM_PARALLEL /t REG_SZ /d "1" /f
echo [OK] OLLAMA_NUM_PARALLEL = 1

REM Remove old C drive Ollama from PATH (if present)
echo.
echo Current PATH contains C:\...\Ollama references.
echo You should manually remove "C:\Users\mkbk312\AppData\Local\Programs\Ollama" from your user PATH.
echo.
echo Done! Restart any open terminals for changes to take effect.
pause
