cmake_minimum_required(VERSION 3.16)
project(SandboxSimulation)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 使用本地SFML库
set(SFML_DIR "${CMAKE_SOURCE_DIR}/SFML-2.6.1/lib/cmake/SFML")
find_package(SFML 2.6 COMPONENTS graphics window system REQUIRED)

# 包含目录
include_directories(include src)

# 源文件
set(SOURCES
    src/main.cpp
    src/core/Game.cpp
    src/core/Grid.cpp
    src/core/Element.cpp
    src/elements/Water.cpp
    src/elements/Sand.cpp
    src/elements/Wood.cpp
    src/elements/Fire.cpp
    src/elements/BurningWood.cpp
    src/elements/EmptyElement.cpp
    src/utils/Timer.cpp
    src/utils/Random.cpp
)

# 可执行文件
add_executable(SandboxSimulation ${SOURCES})

# 链接SFML
target_link_libraries(SandboxSimulation sfml-graphics sfml-window sfml-system)

# 复制资源文件
file(COPY assets DESTINATION ${CMAKE_BINARY_DIR})
