import { FlowNode } from './types';

export const INITIAL_NODES: FlowNode[] = [
  {
    id: '1',
    type: 'time',
    title: '08:00',
    subtitle: '起床',
    color: 'rose',
    duration: '0 MINS'
  },
  {
    id: '2',
    type: 'branch',
    title: '晨间惯例',
    branches: [
      {
        id: '2a',
        type: 'task',
        title: '洗漱',
        subtitle: '洗漱',
        icon: 'Mail',
        color: 'white',
        duration: '15 mins'
      },
      {
        id: '2b',
        type: 'task',
        title: '刷早报',
        subtitle: '刷早报',
        icon: 'Layout',
        color: 'white',
        duration: '10 mins'
      }
    ]
  },
  {
    id: 'block_1',
    type: 'block',
    title: '深度工作',
    subtitle: '专注不受打扰的时间',
    color: 'violet',
    duration: '60 mins',
    icon: 'Hourglass',
    sideEvents: [
        {
            id: 'side_1',
            type: 'time',
            title: '11:10',
            subtitle: '点外卖',
            color: 'rose'
        }
    ]
  },
  {
    id: 'task_lunch',
    type: 'task',
    title: '中饭',
    subtitle: '',
    icon: 'Square',
    color: 'white',
    duration: '30 mins'
  },
  {
    id: 'block_2',
    type: 'block',
    title: '饭后消遣',
    subtitle: '放松休息时间',
    color: 'violet',
    duration: '60 mins',
    icon: 'Hourglass',
    sideEvents: []
  },
  {
    id: 'place_home',
    type: 'place',
    title: '家',
    subtitle: '开始通勤 (地铁)',
    color: 'yellow',
    isDashedConnection: true,
    duration: '5 mins'
  },
  {
    id: 'place_office',
    type: 'place',
    title: '公司',
    subtitle: '到达办公室',
    color: 'teal',
    duration: '45 mins'
  }
];

export const WEEKEND_NODES: FlowNode[] = [
  {
    id: 'w1',
    type: 'time',
    title: '10:00',
    subtitle: '自然醒',
    color: 'teal',
    duration: '0 MINS'
  },
  {
    id: 'w2',
    type: 'task',
    title: 'Brunch',
    subtitle: '自制早午餐',
    icon: 'Coffee',
    color: 'white',
    duration: '45 mins'
  },
  {
    id: 'w_block_1',
    type: 'block',
    title: '户外活动',
    subtitle: '爬山 / 逛公园',
    color: 'yellow',
    duration: '3 hours',
    icon: 'MapPin',
    sideEvents: [
        {
            id: 'w_side_1',
            type: 'time',
            title: '14:00',
            subtitle: '喝咖啡',
            color: 'rose'
        }
    ]
  },
  {
    id: 'w3',
    type: 'time',
    title: '18:00',
    subtitle: '聚餐',
    color: 'rose',
    duration: '0 MINS'
  },
  {
    id: 'w_block_2',
    type: 'block',
    title: '电影之夜',
    subtitle: 'Netflix / 投影仪',
    color: 'violet',
    duration: '2 hours',
    icon: 'Film',
    sideEvents: []
  }
];