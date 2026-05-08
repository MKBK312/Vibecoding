#ifndef RANDOM_H
#define RANDOM_H

#include <random>

class Random {
public:
    static std::mt19937& getEngine();
    static int getInt(int min, int max);
    static float getFloat(float min, float max);

private:
    static std::mt19937 engine;
};

#endif // RANDOM_H
