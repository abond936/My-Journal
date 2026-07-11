import { getObjectPositionForAspectRatio } from '@/lib/utils/objectPositionUtils';
import {
  SQUARE_FEED_TILE_ASPECT,
  SQUARE_FEED_TILE_COVER_BAND_ASPECT,
} from '@/lib/reader/readerFeedPresentation';

describe('square feed cover band object position', () => {
  it('uses vertical focal for portrait images when cover band aspect is applied', () => {
    const image = { width: 900, height: 1600 };
    const low = getObjectPositionForAspectRatio(
      { x: 450, y: 320 },
      image,
      SQUARE_FEED_TILE_COVER_BAND_ASPECT,
      400
    );
    const high = getObjectPositionForAspectRatio(
      { x: 450, y: 1280 },
      image,
      SQUARE_FEED_TILE_COVER_BAND_ASPECT,
      400
    );
    expect(low.split(' ')[1]).not.toBe(high.split(' ')[1]);
  });

  it('locks vertical on 1/1 for typical landscape cover crops', () => {
    const image = { width: 1600, height: 900 };
    const low = getObjectPositionForAspectRatio({ x: 800, y: 180 }, image, SQUARE_FEED_TILE_ASPECT, 400);
    const high = getObjectPositionForAspectRatio({ x: 800, y: 720 }, image, SQUARE_FEED_TILE_ASPECT, 400);
    expect(low).toBe(high);
  });
});
