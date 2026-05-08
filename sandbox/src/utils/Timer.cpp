#include "Timer.h"

Timer::Timer() : running(false) {
}

void Timer::start() {
    if (!running) {
        clock.restart();
        running = true;
    }
}

void Timer::stop() {
    if (running) {
        elapsedTime += clock.getElapsedTime();
        running = false;
    }
}

void Timer::reset() {
    elapsedTime = sf::Time::Zero;
    if (running) {
        clock.restart();
    }
}

sf::Time Timer::getElapsedTime() const {
    if (running) {
        return elapsedTime + clock.getElapsedTime();
    } else {
        return elapsedTime;
    }
}

bool Timer::isRunning() const {
    return running;
}
