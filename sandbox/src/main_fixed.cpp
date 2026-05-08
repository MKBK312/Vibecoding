#include <iostream>
#include <vector>
#include <string>
#include <cstring>
#include <windows.h>

// 简化的元素类型
enum class ElementType {
    EMPTY,
    SAND,
    WATER,
    WOOD,
    FIRE,
    BURNING_WOOD,
    MUD
};

// 颜色定义
const COLORREF COLOR_EMPTY = RGB(0, 0, 0);
const COLORREF COLOR_SAND = RGB(255, 255, 0);
const COLORREF COLOR_WATER = RGB(0, 0, 255);
const COLORREF COLOR_WOOD = RGB(139, 69, 19);
const COLORREF COLOR_FIRE = RGB(255, 0, 0);
const COLORREF COLOR_BURNING_WOOD = RGB(255, 165, 0);
const COLORREF COLOR_MUD = RGB(101, 67, 33);
const COLORREF COLOR_BG = RGB(50, 50, 50);

// 窗口常量
const int WINDOW_WIDTH = 800;
const int WINDOW_HEIGHT = 600;
const int CELL_SIZE = 10;
const int GRID_WIDTH = WINDOW_WIDTH / CELL_SIZE;
const int GRID_HEIGHT = (WINDOW_HEIGHT - 40) / CELL_SIZE;
const int UPDATE_INTERVAL = 50;
const int CONTROL_AREA_HEIGHT = 40;

// 全局变量
std::vector<std::vector<ElementType>> cells(GRID_HEIGHT, std::vector<ElementType>(GRID_WIDTH, ElementType::EMPTY));
ElementType currentElement = ElementType::SAND;
bool running = true;
HWND g_hwnd = NULL;

// 函数声明
LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam);
void UpdateGrid();
void RenderGrid(HDC hdc);
void RenderControls(HDC hdc);
COLORREF GetElementColor(ElementType type);
const char* GetElementName(ElementType type);

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    WNDCLASS wc = {0};
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.hbrBackground = CreateSolidBrush(COLOR_BG);
    wc.lpszClassName = "SandboxWindow";
    wc.hCursor = LoadCursor(NULL, IDC_ARROW);

    if (!RegisterClass(&wc)) {
        MessageBox(NULL, "Window Registration Failed!", "Error!", MB_ICONEXCLAMATION | MB_OK);
        return 0;
    }

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

    SetTimer(hwnd, 1, UPDATE_INTERVAL, NULL);

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
            RenderControls(hdc);
            RenderGrid(hdc);
            EndPaint(hwnd, &ps);
            break;
        }
        case WM_KEYDOWN:
            switch (wParam) {
                case 'A':
                case 'a':
                    currentElement = ElementType::SAND;
                    InvalidateRect(hwnd, NULL, FALSE);
                    break;
                case 'S':
                case 's':
                    currentElement = ElementType::WATER;
                    InvalidateRect(hwnd, NULL, FALSE);
                    break;
                case 'D':
                case 'd':
                    currentElement = ElementType::WOOD;
                    InvalidateRect(hwnd, NULL, FALSE);
                    break;
                case 'F':
                case 'f':
                    currentElement = ElementType::FIRE;
                    InvalidateRect(hwnd, NULL, FALSE);
                    break;
                case 'E':
                case 'e':
                    currentElement = ElementType::EMPTY;
                    InvalidateRect(hwnd, NULL, FALSE);
                    break;
            }
            break;
        case WM_LBUTTONDOWN: {
            int x = LOWORD(lParam) / CELL_SIZE;
            int y = (HIWORD(lParam) - CONTROL_AREA_HEIGHT) / CELL_SIZE;

            if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
                ElementType targetCell = cells[y][x];

                if (targetCell == ElementType::WOOD) {
                    if (currentElement == ElementType::FIRE) {
                        cells[y][x] = ElementType::FIRE;
                        InvalidateRect(hwnd, NULL, FALSE);
                    }
                } else if (targetCell == ElementType::BURNING_WOOD) {
                } else {
                    cells[y][x] = currentElement;
                    InvalidateRect(hwnd, NULL, FALSE);
                }
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
    // 第一步：沙子接触水变成泥巴（水不消失）
    for (int y = 0; y < GRID_HEIGHT; y++) {
        for (int x = 0; x < GRID_WIDTH; x++) {
            if (cells[y][x] == ElementType::SAND) {
                bool hasWater = false;
                for (int dy = -1; dy <= 1; dy++) {
                    for (int dx = -1; dx <= 1; dx++) {
                        int ny = y + dy;
                        int nx = x + dx;
                        if (ny >= 0 && ny < GRID_HEIGHT && nx >= 0 && nx < GRID_WIDTH) {
                            if (cells[ny][nx] == ElementType::WATER) {
                                hasWater = true;
                                break;
                            }
                        }
                    }
                    if (hasWater) break;
                }
                if (hasWater) {
                    cells[y][x] = ElementType::MUD;
                }
            }
        }
    }

    // 第二步：泥巴下沉（与水交换位置）
    for (int y = GRID_HEIGHT - 2; y >= 0; y--) {
        for (int x = 0; x < GRID_WIDTH; x++) {
            if (cells[y][x] == ElementType::MUD) {
                bool moved = false;
                
                // 优先向下移动
                if (cells[y + 1][x] == ElementType::EMPTY) {
                    cells[y + 1][x] = ElementType::MUD;
                    cells[y][x] = ElementType::EMPTY;
                    moved = true;
                } else if (cells[y + 1][x] == ElementType::WATER) {
                    cells[y + 1][x] = ElementType::MUD;
                    cells[y][x] = ElementType::WATER;
                    moved = true;
                }
                
                // 如果不能直接向下，尝试斜向下
                if (!moved) {
                    bool canLeft = (x > 0 && (cells[y + 1][x - 1] == ElementType::EMPTY || cells[y + 1][x - 1] == ElementType::WATER));
                    bool canRight = (x < GRID_WIDTH - 1 && (cells[y + 1][x + 1] == ElementType::EMPTY || cells[y + 1][x + 1] == ElementType::WATER));
                    
                    if (canLeft && canRight) {
                        if (rand() % 2 == 0) {
                            if (cells[y + 1][x - 1] == ElementType::WATER) {
                                cells[y + 1][x - 1] = ElementType::MUD;
                                cells[y][x] = ElementType::WATER;
                            } else {
                                cells[y + 1][x - 1] = ElementType::MUD;
                                cells[y][x] = ElementType::EMPTY;
                            }
                        } else {
                            if (cells[y + 1][x + 1] == ElementType::WATER) {
                                cells[y + 1][x + 1] = ElementType::MUD;
                                cells[y][x] = ElementType::WATER;
                            } else {
                                cells[y + 1][x + 1] = ElementType::MUD;
                                cells[y][x] = ElementType::EMPTY;
                            }
                        }
                    } else if (canLeft) {
                        if (cells[y + 1][x - 1] == ElementType::WATER) {
                            cells[y + 1][x - 1] = ElementType::MUD;
                            cells[y][x] = ElementType::WATER;
                        } else {
                            cells[y + 1][x - 1] = ElementType::MUD;
                            cells[y][x] = ElementType::EMPTY;
                        }
                    } else if (canRight) {
                        if (cells[y + 1][x + 1] == ElementType::WATER) {
                            cells[y + 1][x + 1] = ElementType::MUD;
                            cells[y][x] = ElementType::WATER;
                        } else {
                            cells[y + 1][x + 1] = ElementType::MUD;
                            cells[y][x] = ElementType::EMPTY;
                        }
                    }
                }
            }
        }
    }

    // 第三步：水流动（只移动到空单元格）
    for (int y = GRID_HEIGHT - 1; y >= 0; y--) {
        for (int x = 0; x < GRID_WIDTH; x++) {
            if (cells[y][x] == ElementType::WATER) {
                if (y < GRID_HEIGHT - 1 && cells[y + 1][x] == ElementType::EMPTY) {
                    cells[y + 1][x] = ElementType::WATER;
                    cells[y][x] = ElementType::EMPTY;
                } else {
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

void RenderControls(HDC hdc) {
    RECT rect = {0, 0, WINDOW_WIDTH, CONTROL_AREA_HEIGHT};
    HBRUSH brush = CreateSolidBrush(COLOR_BG);
    FillRect(hdc, &rect, brush);
    DeleteObject(brush);

    SetTextColor(hdc, RGB(255, 255, 255));
    SetBkColor(hdc, COLOR_BG);

    const char* hint1 = "Controls: ";
    TextOutA(hdc, 10, 12, hint1, strlen(hint1));

    const char* colorHints[] = {
        "A=Sand(Yellow) ",
        "S=Water(Blue) ",
        "D=Wood(Brown) ",
        "F=Fire(Red) ",
        "E=Clear "
    };

    HFONT hFont = CreateFont(16, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
        DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
        DEFAULT_QUALITY, DEFAULT_PITCH | FF_DONTCARE, "Arial");
    SelectObject(hdc, hFont);

    int xPos = 90;
    COLORREF colors[] = {COLOR_SAND, COLOR_WATER, COLOR_WOOD, COLOR_FIRE, RGB(128, 128, 128)};

    for (int i = 0; i < 5; i++) {
        SetTextColor(hdc, colors[i]);
        TextOutA(hdc, xPos, 12, colorHints[i], strlen(colorHints[i]));
        xPos += strlen(colorHints[i]) * 8;
    }

    const char* current = "Current: ";
    TextOutA(hdc, 10, 28, current, strlen(current));

    const char* elementName = GetElementName(currentElement);
    SetTextColor(hdc, GetElementColor(currentElement));
    TextOutA(hdc, 80, 28, elementName, strlen(elementName));

    DeleteObject(hFont);
}

void RenderGrid(HDC hdc) {
    for (int y = 0; y < GRID_HEIGHT; y++) {
        for (int x = 0; x < GRID_WIDTH; x++) {
            COLORREF color = GetElementColor(cells[y][x]);
            HBRUSH brush = CreateSolidBrush(color);
            RECT rect = {
                x * CELL_SIZE,
                y * CELL_SIZE + CONTROL_AREA_HEIGHT,
                (x + 1) * CELL_SIZE,
                (y + 1) * CELL_SIZE + CONTROL_AREA_HEIGHT
            };
            FillRect(hdc, &rect, brush);
            DeleteObject(brush);
        }
    }
}

COLORREF GetElementColor(ElementType type) {
    switch (type) {
        case ElementType::EMPTY: return COLOR_EMPTY;
        case ElementType::SAND: return COLOR_SAND;
        case ElementType::WATER: return COLOR_WATER;
        case ElementType::WOOD: return COLOR_WOOD;
        case ElementType::FIRE: return COLOR_FIRE;
        case ElementType::BURNING_WOOD: return COLOR_BURNING_WOOD;
        case ElementType::MUD: return COLOR_MUD;
        default: return COLOR_EMPTY;
    }
}

const char* GetElementName(ElementType type) {
    switch (type) {
        case ElementType::EMPTY: return "Empty";
        case ElementType::SAND: return "Sand";
        case ElementType::WATER: return "Water";
        case ElementType::WOOD: return "Wood";
        case ElementType::FIRE: return "Fire";
        case ElementType::BURNING_WOOD: return "Burning Wood";
        case ElementType::MUD: return "Mud";
        default: return "Empty";
    }
}
