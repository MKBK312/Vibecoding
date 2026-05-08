@echo off

REM 测试沙盒模拟程序
 echo 测试沙盒模拟程序...
 echo ===================
 echo 1. 启动程序
 echo 2. 测试元素放置
 echo 3. 测试沙子下落
 echo 4. 测试元素切换
 echo ===================

REM 运行程序并输入测试命令
echo a> input.txt
echo 10 5>> input.txt
echo 15 5>> input.txt
echo 12 3>> input.txt
echo 13 3>> input.txt
echo 14 3>> input.txt
echo s>> input.txt
echo 5 5>> input.txt
echo d>> input.txt
echo 20 10>> input.txt
echo f>> input.txt
echo 20 9>> input.txt
echo q>> input.txt

REM 运行程序并输入测试命令
SandboxSimulation.exe < input.txt

echo 测试完成！
echo 按任意键退出...
pause > nul
