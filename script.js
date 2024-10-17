
const YEAR = 2024,
      PASSAGE_COUNT = 12,
      RECITATION_MINUTES = 8;

var passageCache = {};


function wordClicked(span) {
  console.log('word clicked', span);
}

function verseNumberClicked(span) {
  console.log('clicked verse number', span);
}

async function generate() {
  console.log('generating passages')
  document.getElementById('passages').style.opacity = 0;
  let passages = await fetchPassages('Senior', 'NKJV')
  let maxWords = 170;
  if (maxWords) {
    passages = passages.filter(passage => (passage.word_count <= maxWords));
    console.log(`${passages.length} passages remaining after filtering those with greater than ${maxWords} words`);
  }
  passages = await choosePassages(passages, PASSAGE_COUNT, RECITATION_MINUTES, 140);
  setPassages(passages);
  /* console.log(passages); */
}


async function fetchPassages(division, translation) {
  let passages = passageCache[division];
  if (passages === undefined) {
    passages = await (await fetch(`${YEAR}/${division.toLowerCase()}-${translation.toLowerCase()}.json`, {method: 'GET'})).json();
    passageCache[division] = passages;
  }
  return passages;
}

function choosePassages(passages, count, totalMinutes, targetWordsPerMinute) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      let minRate = targetWordsPerMinute - 7.5,
          maxRate = targetWordsPerMinute + 7.5,
          attempt, words, wpm;

      for (attempt = 0; attempt < 1000000; attempt++) {
        let picked = pick(passages, count);
        words = picked.reduce((total, p) => (total + p.word_count), 0);
        wpm = words / totalMinutes;
        if (minRate <= wpm && wpm <= maxRate) {
          console.log(`chose ${count} passages: words = ${words}, wpm = ${wpm}`);
          resolve(picked);
          return;
        }
      }
      reject('Maximum attempts reached. Please adjust parameters and try again.');
    }, 0);
  });
}


function pick(items, count) {
  let indices = Array.from(items, (_, i) => i),
    chosen = [];
  while (indices.length && chosen.length < count) {
    let i = Math.floor(Math.random() * indices.length);
    chosen.push(items[indices.splice(i, 1)[0]]);
  }
  return chosen;
}

function setPassages(passages) {
  let node = document.createDocumentFragment()
  passages.map((p, i) => {
    let div = document.createElement('div');
    node.appendChild(div);
    passageCard(div, p, i + 1);
  });
  let div = document.getElementById('passages');
  div.replaceChildren(node);
  div.style.opacity = 1;
}

function passageCard(card, passage, number) {
  card.className = "card text-bg-light border-secondary shadow mx-auto m-4";
  card.innerHTML = `
        <div class="card-header">
          <div class="row">
            <div class="col"><span class="fs-4">${number}</span></div>
            <div class="col position-relative"><span class="badge bg-${passage.division} fs-6 rounded-pill position-absolute top-50 start-50 translate-middle" aria-lable="division and passage number" title="division&nbsp;&nbsp;•&nbsp;&nbsp;passage number">${passage.division}&nbsp;&nbsp;•&nbsp;&nbsp;${passage.passage_number}</span></div>
            <div class="col">
              <div class="float-end" role="group" aria-label="Passage buttons">
                <button type="button" class="btn btn-secondary btn-sm" aria-label="start over" title="start over">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-skip-backward-fill" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M.5 3.5A.5.5 0 0 0 0 4v8a.5.5 0 0 0 1 0V8.753l6.267 3.636c.54.313 1.233-.066 1.233-.697v-2.94l6.267 3.636c.54.314 1.233-.065 1.233-.696V4.308c0-.63-.693-1.01-1.233-.696L8.5 7.248v-2.94c0-.63-.692-1.01-1.233-.696L1 7.248V4a.5.5 0 0 0-.5-.5"/>
                  </svg>
                </button>
                <button type="button" class="btn btn-secondary btn-sm" aria-label="pass" title="pass">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-escape" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M8.538 1.02a.5.5 0 1 0-.076.998 6 6 0 1 1-6.445 6.444.5.5 0 0 0-.997.076A7 7 0 1 0 8.538 1.02"/>
                    <path d="M7.096 7.828a.5.5 0 0 0 .707-.707L2.707 2.025h2.768a.5.5 0 1 0 0-1H1.5a.5.5 0 0 0-.5.5V5.5a.5.5 0 0 0 1 0V2.732z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="card-body">
          <h5 class="card-title"><span class="verse-word">${passage.reference}</span></h5>
          <p class="card-text">
          </p>
          <div class="card-subtitle"><span class="verse-word">${passage.reference}</span></div>
        </div>
        <div class="card-footer">
          <div class="row">
            <div class="col" aria-label="cards, verses, and words" title="cards / verses / words">${passage.cards.length} / ${passage.verse_count} / ${passage.word_count}</div>
            <div class="col position-relative"><span class="position-absolute top-50 start-50 translate-middle" aria-label="translation and release" title="translation&nbsp;&nbsp;•&nbsp;&nbsp;release">${passage.translation}&nbsp;&nbsp;•&nbsp;&nbsp;${passage.release}</span></div>
            <div class="col"></div>
          </div>
        </div>
      </div>
`;

  for (let span of card.getElementsByClassName('verse-word')) {
    span.onclick = wordClicked;
  }
  card.getElementsByClassName('card-text')[0].appendChild(
    createSpans(passage.cards.join(' '), /(\(\d+\))/,
      (text) => {
        let span = document.createElement('span');
        span.insertAdjacentText('afterbegin', text);
        span.className = 'verse-number';
        span.onclick = verseNumberClicked;
        return span;
      },
      (text) => {
        return createSpans(text, /(\s+)/,
          (text) => { return document.createTextNode(text); },
          (text) => {
            if (text.search(/\w/) == -1) {
              return document.createTextNode(text);
            }
            let span = document.createElement('span');
            span.insertAdjacentText('afterbegin', text);
            span.className = 'verse-word';
            span.onclick = wordClicked;
            return span;
          }
        );
      }
    )
  );
  return card;
}

function createSpans(text, regex, matched, unmatched) {
  let spans = document.createDocumentFragment();
  text.split(regex).map((text, i) => {
    spans.appendChild(i % 2 ? matched(text) : unmatched(text));
  });
  return spans;
}

document.addEventListener("DOMContentLoaded", function() {
  console.log("loaded!");
})
