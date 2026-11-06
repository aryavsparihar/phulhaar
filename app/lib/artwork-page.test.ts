import {describe, expect, it} from 'vitest';
import {
  addRecent,
  artworkJsonLd,
  enquiryMailto,
  jsonForScript,
  parseRecent,
  roomLayout,
  type ArtworkFacts,
} from '~/lib/artwork-page';

const work: ArtworkFacts = {
  title: 'Peacock at Dawn',
  url: 'https://phulhaargallery.com/products/sita-devi-peacock-at-dawn-2024',
  artist: 'Sita Devi',
  year: '2024',
  medium: 'Natural pigments',
  surface: 'Handmade paper',
  dimensions: '60 × 45 cm (23¾ × 17¾ in)',
  heightCm: 60,
  widthCm: 45,
  depthCm: null,
  description: 'A peacock in indigo and gold.',
  images: ['https://cdn.shopify.com/s/files/peacock.jpg'],
  price: {amount: '45000.0', currencyCode: 'INR'},
  available: true,
};

const bodyOf = (mailto: string) =>
  decodeURIComponent(new URL(mailto).searchParams.get('body') ?? '');
const subjectOf = (mailto: string) =>
  decodeURIComponent(new URL(mailto).searchParams.get('subject') ?? '');

describe('enquiryMailto', () => {
  it('names the work, artist, year, medium, size and address', () => {
    const mailto = enquiryMailto('hello@pjk.co.in', work);
    expect(mailto.startsWith('mailto:hello@pjk.co.in?')).toBe(true);
    expect(subjectOf(mailto)).toBe('Enquiry: Peacock at Dawn by Sita Devi');
    const body = bodyOf(mailto);
    for (const fact of [
      'Peacock at Dawn',
      'Sita Devi',
      'Natural pigments, 2024',
      '60 × 45 cm',
      work.url,
    ]) {
      expect(body).toContain(fact);
    }
  });

  it('asks about similar works when this one has sold', () => {
    const mailto = enquiryMailto('hello@pjk.co.in', {
      ...work,
      available: false,
    });
    expect(subjectOf(mailto)).toContain('Similar works by Sita Devi');
    expect(bodyOf(mailto)).toContain('similar works by Sita Devi');
  });

  it('leaves out what is not known rather than printing blanks', () => {
    const body = bodyOf(
      enquiryMailto('hello@pjk.co.in', {
        ...work,
        artist: null,
        year: null,
        medium: null,
        dimensions: null,
      }),
    );
    expect(body).not.toContain('null');
    expect(body).not.toMatch(/\n\n\n/);
  });
});

describe('artworkJsonLd', () => {
  it('describes a VisualArtwork that is also a Product with an Offer', () => {
    const data = artworkJsonLd(work);
    expect(data['@type']).toEqual(['VisualArtwork', 'Product']);
    expect(data.artist).toEqual({'@type': 'Person', name: 'Sita Devi'});
    expect(data.artMedium).toBe('Natural pigments');
    expect(data.artworkSurface).toBe('Handmade paper');
    expect(data.height).toEqual({
      '@type': 'QuantitativeValue',
      value: 60,
      unitCode: 'CMT',
    });
    expect(data.offers).toMatchObject({
      price: '45000.0',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: work.url,
    });
  });

  it('marks a sold work as sold out', () => {
    expect(
      artworkJsonLd({...work, available: false}).offers?.availability,
    ).toBe('https://schema.org/SoldOut');
  });
});

describe('jsonForScript', () => {
  it('cannot close the script element it sits in', () => {
    const out = jsonForScript({name: '</script><script>alert(1)</script>'});
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({
      name: '</script><script>alert(1)</script>',
    });
  });
});

describe('roomLayout', () => {
  it('hangs a work at its true size, centred on the 145 cm eye line', () => {
    const room = roomLayout(60, 45);
    expect(room.wall).toEqual({width: 300, height: 240});
    expect(room.art.width).toBe(45);
    expect(room.art.height).toBe(60);
    const centreFromFloor =
      room.wall.height - (room.art.y + room.art.height / 2);
    expect(centreFromFloor).toBe(145);
    expect(room.art.x + room.art.width / 2).toBe(150);
  });

  it('gives a very large work a bigger wall instead of shrinking it', () => {
    const room = roomLayout(260, 400);
    expect(room.wall.width).toBeGreaterThanOrEqual(400);
    expect(room.wall.height).toBeGreaterThanOrEqual(260);
    expect(room.art.y).toBeGreaterThanOrEqual(0);
    expect(room.art.y + room.art.height).toBeLessThanOrEqual(room.wall.height);
  });

  it('keeps a tall work off the floor', () => {
    const room = roomLayout(200, 80);
    expect(
      room.wall.height - (room.art.y + room.art.height),
    ).toBeGreaterThanOrEqual(15);
  });
});

describe('recently viewed', () => {
  const a = {handle: 'a', title: 'A', artist: null, image: null};
  const b = {handle: 'b', title: 'B', artist: 'X', image: null};

  it('puts the latest first without duplicates', () => {
    expect(addRecent([a, b], b).map((w) => w.handle)).toEqual(['b', 'a']);
  });

  it('drops anything not in the shape this code writes', () => {
    const raw = JSON.stringify([
      a,
      {handle: '../../evil', title: 'x'},
      {handle: 'c', title: 'C', image: 'javascript:alert(1)'},
      {handle: 'd', title: 'D', image: 'https://evil.example/x.jpg'},
      {handle: 'e', title: 'E', image: 'https://cdn.shopify.com/e.jpg'},
      'nonsense',
    ]);
    const list = parseRecent(raw);
    expect(list.map((w) => w.handle)).toEqual(['a', 'c', 'd', 'e']);
    expect(list.find((w) => w.handle === 'c')?.image).toBeNull();
    expect(list.find((w) => w.handle === 'd')?.image).toBeNull();
    expect(list.find((w) => w.handle === 'e')?.image).toBe(
      'https://cdn.shopify.com/e.jpg',
    );
  });

  it('survives storage that is empty or corrupt', () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent('{not json')).toEqual([]);
  });
});
