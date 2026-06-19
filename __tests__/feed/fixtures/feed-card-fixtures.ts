import type { PredictionContent } from '@/components/feed/PredictionFeedCard';
import type { PerpsEntryMarker } from '@/components/feed/PerpsPositionFeedCard';

export const btcUpWonFeedPost: PredictionContent = {
  marketTitle: 'BTC 5-Minute Up or Down',
  marketType: 'btc5m',
  marketId:
    '0xf7b80ed024fb11dd1fd3fce617a59e41e6d8095d794937f26b6400979148754c',
  marketSlug: 'btc-updown-5m-1781836200',
  btcWindowStart: 1781836200,
  outcome: 'Up',
  side: 'BUY',
  cost: 1.019999,
  potentialWin: 2.615383,
  price: 0.3899998585293244,
  orderId:
    '0x067a9fa40ca6fde0ad23926151a3a1ab956b17e37a9012b29b3e0a9bc1bea884',
  yesOutcome: 'Up',
  noOutcome: 'Down',
  yesTokenId:
    '650772394347256322993453412575341261012542910488700298280690494229061991645',
  noTokenId:
    '70384465825970993815844068765609179908034160003838261315467102640689641682559',
};

export const mexicoClaimedOverrideFeedPost: PredictionContent = {
  marketTitle: 'Spread: Mexico (-1.5)',
  marketId:
    '0x81d3c86751ca93f01717914355372e3e0198d90d5fd9e3b8533efa272d25c369',
  outcome: 'Mexico',
  side: 'BUY',
  cost: 0.999999,
  potentialWin: 4.347825,
  price: 0.22999982749995684,
  orderId:
    '0x6ca519498b389f05ae8ebd117e91feb43205ee9e0489e45c56a18f2812d0006b',
  yesOutcome: 'Mexico',
  noOutcome: 'Korea Republic',
  yesTokenId:
    '17423939178352074957942269777595651956985179333403522357366725357374589433745',
  noTokenId:
    '103477304842923726149523032830287826002314941322431409265596250022340281723944',
  claimed: true,
  redeemed: true,
  claimAmount: 4.347825,
  redeemAmount: 4.347825,
  status: 'claimed',
  result: 'won',
};

export const repeatedMorphoPerpsEntries: PerpsEntryMarker[] = [
  {
    event: 'open',
    orderId: 'morpho-open',
    price: 1.9407,
    timestamp: '2026-06-18T18:51:51.278Z',
  },
  {
    event: 'add',
    orderId: 'morpho-add-1',
    price: 1.9522,
    timestamp: '2026-06-19T02:05:01.115Z',
  },
  {
    event: 'add',
    orderId: 'morpho-add-2',
    price: 1.9584,
    timestamp: '2026-06-19T02:07:22.015Z',
  },
];
