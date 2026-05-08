#include "Random.h"

std::mt19937 Random::engine(std::random_device{}());

std::mt19937& Random::getEngine() {
    return engine;
}

int Random::getInt(int min, int max) {
    std::uniform_int_distribution<int> dist(min, max);
    return dist(engine);
}

float Random::getFloat(float min, float max) {
    std::uniform_real_distribution<float> dist(min, max);
    return dist(engine);
}
