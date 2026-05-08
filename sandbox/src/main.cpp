#include <iostream>
#include <vector>
#include <string>
#include <windows.h>

// 简化的元素类型
enum class ElementType {
    EMPTY,
    SAND,
    WATER,
    WOOD,
    FIRE,
    BURNING_WOOD
};

// 颜色定义
const COLORREF COLOR_EMPTY = RGB(0, 0, 0);
const COLORREF COLOR_SAND = RGB(255, 255, 0);
const COLORREF COLOR_WATER = RGB(0, 0, 255);
const COLORREF COLOR_WOOD = RGB(139, 69, 19);
const COLORREF COLOR_FIRE = RGB(255, 0, 0);
const COLORREF COLOR_BURNING_WOOD = RGB(255, 165, 0);

// 窗口常量
const int WINDOW_WIDTH = 800;
const int WINDOW_HEIGHT = 600;
const int CELL_SIZE = 10;
const int GRID_WIDTH = WINDOW_WIDTH / CELL_SIZE;
const int GRID_HEIGHT = WINDOW_HEIGHT / CELL_SIZE;
const int UPDATE_INTERVAL = 50;

// 全局变量
std::vector<std::vector<ElementType>> cells(GRID_HEIGHT, std::vector<ElementType>(GRID_WIDTH, ElementType::EMPTY));
ElementType currentElement = ElementType::SAND;
bool running = true;
HWND g_hwnd = NULL;

// 函数声明
LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam);
void UpdateGrid();
void RenderGrid(HDC hdc);
COLORREF GetElementColor(ElementType type);

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    // 注册窗口类
    WNDCLASS wc = {0};
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.hbrBackground = CreateSolidBrush(COLOR_EMPTY);
    wc.lpszClassName = "SandboxWindow";
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);
    
    if (!RegisterClass(&wc)) {
        MessageBox(NULL, "Window Registration Failed!", "Error!", MB_ICONEXCLAMATION | MB_OK);
        return 0;
    }
    
    // 创建窗口
    HWND hwnd = CreateWindowEx(
        0,
        "SandboxWindow",
        "Sandbox Simulation",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, WINDOW_WIDTH, WINDOW_HEIGHT,
        NULL, NULL, hInstance, NULL
    );
    
    if (hwnd == NULL) {
        MessageBox(NULL, "Window Creation Failed!", "Error!", MB_ICONEXCLAMATION | MB_OK);
        return 0;
    }
    
    g_hwnd = hwnd;
    ShowWindow(hwnd, nCmdShow);
    UpdateWindow(hwnd);
    
    // 设置定时器
    SetTimer(hwnd, 1, UPDATE_INTERVAL, NULL);
    
    // 消息循环
    MSG msg;
    while (running && GetMessage(&msg, NULL, 0, 0) > 0) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    
    return msg.wParam;
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch(msg) {
        case WM_TIMER:
            if (wParam == 1) {
                UpdateGrid();
                InvalidateRect(hwnd, NULL, FALSE);
            }
            break;
        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            RenderGrid(hdc);
            EndPaint(hwnd, &ps);
            break;
        }
        case WM_KEYDOWN:
            switch (wParam) {
                case 'A':
                case 'a':
                    currentElement = ElementType::SAND;
                    break;
                case 'S':
                case 's':
                    currentElement = ElementType::WATER;
                    break;
                case 'D':
                case 'd':
                    currentElement = ElementType::WOOD;
                    break;
                case 'F':
                case 'f':
                    currentElement = ElementType::FIRE;
                    break;
                case 'E':
                case 'e':
                    currentElement = ElementType::EMPTY;
                    break;
            }
            break;
        case WM_LBUTTONDOWN: {
            int x = LOWORD(lParam) / CELL_SIZE;
            int y = HIWORD(lParam) / CELL_SIZE;
            if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                cells[y][x] = currentElement;
                InvalidateRect(hwnd, NULL, FALSE);
            }
            break;
        }
        case WM_DESTROY:
            running = false;
            KillTimer(hwnd, 1);
            PostQuitMessage(0);
            break;
        default:
            return DefWindowProc(hwnd, msg, wParam, lParam);
    }
    return 0;
}

void UpdateGrid() {
    // 简单的沙子下落逻辑
    for (int y = GRID_HEIGHT - 2; y >= 0; y--) {
        for (int x = 0; x < GRID_WIDTH; x++) {
            if (cells[y][x] == ElementType::SAND) {
                if (cells[y + 1][x] == ElementType::EMPTY) {
                    cells[y + 1][x] = ElementType::SAND;
                    cells[y][x] = ElementType::EMPTY;
                } else if (x > 0 && cells[y + 1][x - 1] == ElementType::EMPTY) {
                    cells[y + 1][x - 1] = ElementType::SAND;
                    cells[y][x] = ElementType::EMPTY;
                } else if (x < GRID_WIDTH - 1 && cells[y + 1][x + 1] == ElementType::EMPTY) {
                    cells[y + 1][x + 1] = ElementType::SAND;
                    cells[y][x] = ElementType::EMPTY;
                }
            }
        }
    }
    
    // 简单的水流逻辑
    for (int y = GRID_HEIGHT - 1; y >= 0; y--) {
        for (int x = 0; x < GRID_WIDTH; x++) {
            if (cells[y][x] == ElementType::WATER) {
                // 向下流动
                if (y < GRID_HEIGHT - 1 && cells[y + 1][x] == ElementType::EMPTY) {
                    cells[y + 1][x] = ElementType::WATER;
                    cells[y][x] = ElementType::EMPTY;
                } else {
                    // 水平流动
                    if (x > 0 && cells[y][x - 1] == ElementType::EMPTY) {
                        cells[y][x - 1] = ElementType::WATER;
                        cells[y][x] = ElementType::EMPTY;
                    } else if (x < GRID_WIDTH - 1 && cells[y][x + 1] == ElementType::EMPTY) {
                        cells[y][x + 1] = ElementType::WATER;
                        cells[y][x] = ElementType::EMPTY;
                    }
                }
            }
        }
    }
}

void RenderGrid(HDC hdc) {
    // 绘制网格
    for (int y = 0; y < GRID_HEIGHT; y++) {
        for (int x = 0; x < GRID_WIDTH; x++) {
            COLORREF color = GetElementColor(cells[y][x]);
            HBRUSH brush = CreateSolidBrush(color);
            RECT rect = {
                x * CELL_SIZE,
                y * CELL_SIZE,
                (x + 1) * CELL_SIZE,
                (y + 1) * CELL_SIZE
            };
            FillRect(hdc, &rect, brush);
            DeleteObject(brush);
        }
    }
    
    // 绘制控制提示
    SetTextColor(hdc, RGB(255, 255, 255));
    SetBkColor(hdc, RGB(0, 0, 0));
    const char* hint = "Controls: A=Sand, S=Water, D=Wood, F=Fire, E=Empty";
    TextOutA(hdc, 10, 10, hint, strlen(hint));
}

COLORREF GetElementColor(ElementType type) {
    switch (type) {
        case ElementType::EMPTY:
            return COLOR_EMPTY;
        case ElementType::SAND:
            return COLOR_SAND;
        case ElementType::WATER:
            return COLOR_WATER;
        case ElementType::WOOD:
            return COLOR_WOOD;
        case ElementType::FIRE:
            return COLOR_FIRE;
        case ElementType::BURNING_WOOD:
            return COLOR_BURNING_WOOD;
        default:
            return COLOR_EMPTY;
    }
}
