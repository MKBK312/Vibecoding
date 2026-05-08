/**
 * 元素类型定义
 */
export const ElementType = {
    EMPTY: 0,
    SAND: 1,
    WATER: 2,
    WOOD: 3,
    FIRE: 4,
    BURNING_WOOD: 5,
    MUD: 6
};

/**
 * 元素颜色配置
 */
export const COLORS = {
    [ElementType.EMPTY]: 'rgb(0, 0, 0)',
    [ElementType.SAND]: 'rgb(255, 255, 0)',
    [ElementType.WATER]: 'rgb(0, 0, 255)',
    [ElementType.WOOD]: 'rgb(139, 69, 19)',
    [ElementType.FIRE]: 'rgb(255, 0, 0)',
    [ElementType.BURNING_WOOD]: 'rgb(255, 165, 0)',
    [ElementType.MUD]: 'rgb(101, 67, 33)'
};

/**
 * 元素名称配置
 */
export const ELEMENT_NAMES = {
    [ElementType.EMPTY]: '清除',
    [ElementType.SAND]: '沙子',
    [ElementType.WATER]: '水',
    [ElementType.WOOD]: '木头',
    [ElementType.FIRE]: '火',
    [ElementType.BURNING_WOOD]: '燃烧的木头',
    [ElementType.MUD]: '泥巴'
};

/**
 * 元素快捷键配置
 */
export const KEY_MAP = {
    'a': ElementType.SAND,
    's': ElementType.WATER,
    'd': ElementType.WOOD,
    'f': ElementType.FIRE,
    'e': ElementType.EMPTY
};
