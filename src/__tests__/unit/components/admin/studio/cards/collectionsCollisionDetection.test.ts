import { closestCenter, pointerWithin, rectIntersection, type Collision } from '@dnd-kit/core';
import { collectionsCollisionDetection } from '@/components/admin/studio/cards/collectionsCollisionDetection';

jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core');
  return {
    ...actual,
    closestCenter: jest.fn(),
    pointerWithin: jest.fn(),
    rectIntersection: jest.fn(),
  };
});

const mockPointerWithin = pointerWithin as jest.MockedFunction<typeof pointerWithin>;
const mockRectIntersection = rectIntersection as jest.MockedFunction<typeof rectIntersection>;
const mockClosestCenter = closestCenter as jest.MockedFunction<typeof closestCenter>;

function runCollision(activeId: string): Collision[] {
  return collectionsCollisionDetection({
    active: { id: activeId },
    collisionRect: {} as never,
    droppableRects: new Map(),
    droppableContainers: [] as never,
    pointerCoordinates: { x: 0, y: 0 },
  } as never);
}

describe('collectionsCollisionDetection assignment safety', () => {
  beforeEach(() => {
    mockPointerWithin.mockReset();
    mockRectIntersection.mockReset();
    mockClosestCenter.mockReset();
  });

  it('does not guess a source-media relationship target when the pointer is on no live target', () => {
    mockPointerWithin.mockReturnValue([]);
    mockRectIntersection.mockReturnValue([]);
    mockClosestCenter.mockReturnValue([{ id: 'drop:cover' }] as Collision[]);

    expect(runCollision('source:media-1')).toEqual([]);
    expect(mockClosestCenter).not.toHaveBeenCalled();
  });

  it('does not guess a gallery drag target when the pointer is on no live target', () => {
    mockPointerWithin.mockReturnValue([]);
    mockRectIntersection.mockReturnValue([]);
    mockClosestCenter.mockReturnValue([{ id: 'drop:cover' }] as Collision[]);

    expect(runCollision('gallery:media-1:0')).toEqual([]);
    expect(mockClosestCenter).not.toHaveBeenCalled();
  });

  it('still allows live source-media hits to win normally', () => {
    mockPointerWithin.mockReturnValue([{ id: 'drop:body' }] as Collision[]);
    mockRectIntersection.mockReturnValue([]);

    expect(runCollision('source:media-1').map((hit) => String(hit.id))).toEqual(['drop:body']);
  });

  it('prefers compose targets over pile headers for source-media drags', () => {
    mockPointerWithin.mockReturnValue([{ id: 'pile:cluster-1' }, { id: 'drop:gallery' }] as Collision[]);
    mockRectIntersection.mockReturnValue([]);

    expect(runCollision('source:media-1').map((hit) => String(hit.id))).toEqual(['drop:gallery']);
  });

  it('allows pile header hits when no compose target is under the pointer', () => {
    mockPointerWithin.mockReturnValue([{ id: 'pile:cluster-1' }] as Collision[]);
    mockRectIntersection.mockReturnValue([]);

    expect(runCollision('source:media-1').map((hit) => String(hit.id))).toEqual(['pile:cluster-1']);
  });

  it('ignores rect-intersection-only cover hits for source-media drags', () => {
    mockPointerWithin.mockReturnValue([]);
    mockRectIntersection.mockReturnValue([{ id: 'drop:cover' }] as Collision[]);

    expect(runCollision('source:media-1')).toEqual([]);
    expect(mockClosestCenter).not.toHaveBeenCalled();
  });

  it('ignores rect-intersection-only cover hits for gallery drags', () => {
    mockPointerWithin.mockReturnValue([]);
    mockRectIntersection.mockReturnValue([{ id: 'drop:cover' }] as Collision[]);

    expect(runCollision('gallery:media-1:0')).toEqual([]);
    expect(mockClosestCenter).not.toHaveBeenCalled();
  });

  it('ignores rect-intersection-only structural hits for card drags', () => {
    mockPointerWithin.mockReturnValue([]);
    mockRectIntersection.mockReturnValue([{ id: 'tree-root' }] as Collision[]);

    expect(runCollision('card:card-1')).toEqual([]);
    expect(mockClosestCenter).not.toHaveBeenCalled();
  });

  it('still allows live compose-child attach hits for card drags', () => {
    mockPointerWithin.mockReturnValue([{ id: 'studio-parent:card-1' }] as Collision[]);
    mockRectIntersection.mockReturnValue([]);

    expect(runCollision('card:card-2').map((hit) => String(hit.id))).toEqual(['studio-parent:card-1']);
  });
});
