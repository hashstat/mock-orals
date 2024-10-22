
const YEAR = 2024,
      PASSAGE_COUNT = 12,
      RECITATION_MINUTES = 8,
      passageCache = {};


async function generate() {
  console.log('generating passages')
  document.getElementById('passages').style.opacity = 0;
  let passages = await fetchPassages('Senior', 'NKJV')
  const maxWords = 170;
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
      const minRate = targetWordsPerMinute - 7.5,
            maxRate = targetWordsPerMinute + 7.5;
      let attempt, words, wpm;

      for (attempt = 0; attempt < 1000000; attempt++) {
        const picked = pick(passages, count);
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
  const indices = Array.from(items, (_, i) => i),
    chosen = [];
  while (indices.length && chosen.length < count) {
    const i = Math.floor(Math.random() * indices.length);
    chosen.push(items[indices.splice(i, 1)[0]]);
  }
  return chosen;
}


function setPassages(passages) {
  const node = document.createDocumentFragment()
  for (const [i, passage] of passages.entries()) {
    node.appendChild(passageCard(passage,i + 1));
  }
  for (const btn of node.querySelectorAll('button.btn-card-start-over')) {
    btn.addEventListener('click', startOverClicked)
  }
  for (const btn of node.querySelectorAll('button.btn-card-pass')) {
    btn.addEventListener('click', passClicked);
  }
  for (const btn of node.querySelectorAll('button.btn-card-complete')) {
    btn.addEventListener('click', completeClicked);
  }
  for (const words of node.querySelectorAll('div.card-body')) {
    words.addEventListener('click', wordClicked);
  }

  const div = document.getElementById('passages');
  div.replaceChildren(node);
  div.style.opacity = 1;
}


function passageCard(passage, number) {
  /* Create card node by cloning the html template, then fill in fields. */
  const card = document.getElementById('verse-card-template').content.cloneNode(true);
  card.querySelector('.passage-number').textContent = number;
  const div = card.querySelector('.division-passage');
  div.innerHTML = `${passage.division}&nbsp;&nbsp;•&nbsp;&nbsp;${passage.passage_number}`;
  div.classList.add(`bg-${passage.division}`);
  for (const span of card.querySelectorAll('.passage-reference')) {
    span.textContent = passage.reference;
  }
  card.querySelector('.passage-stats').textContent = `${passage.cards.length} / ${passage.verse_count} / ${passage.word_count}`;
  card.querySelector('.translation-release').innerHTML = `${passage.translation}&nbsp;&nbsp;•&nbsp;&nbsp;${passage.release}`;

  /* Split card text and put each word in its own span, then add to card. */
  const spans = document.createDocumentFragment();
  for (const [i, word] of passage.cards.join(' ').split(/(\s+)/).entries()) {
    if (i % 2) {
      spans.append(document.createTextNode(word));
    } else {
      const span = document.createElement('span');
      span.insertAdjacentText('afterbegin', word);
      span.className = /^\(\d+\)$/.test(word) ? 'verse-number' : 'verse-word';
      spans.appendChild(span);
    }
  }
  card.querySelector('.card-text').appendChild(spans);

  return card;
}


function wordClicked(event) {
  console.log('word clicked', event);
  if (event.target.classList.contains('verse-number')) {
    const method = event.target.classList.toggle('word-error') ? 'add' : 'remove';
    for (let node = event.target.nextElementSibling;
         node && !node.classList.contains('verse-number');
         node = node.nextElementSibling) {
      node.classList[method]('word-error')
    }
  } else {
    event.target.classList.toggle('word-error');
  }
  event.stopPropagation();
}


function startOverClicked(event) {
  console.log('start over clicked', event);
  const card = event.target.closest('div.card');
  card.classList.remove('card-completed', 'card-passed');
  for (const node of card.querySelectorAll('span.word-warning')) {
    node.classList.remove('word-warning');
  }
  for (const node of card.querySelectorAll('span.word-error')) {
    node.classList.add('word-warning');
    node.classList.remove('word-error');
  }
}


function passClicked(event) {
  console.log('pass clicked', event);
  const card = event.target.closest('div.card');
  card.classList.add('card-passed');
  card.classList.remove('card-completed');
}


function completeClicked(event) {
  console.log('complete clicked', event);
  const card = event.target.closest('div.card');
  card.classList.add('card-completed');
  card.classList.remove('card-passed');
}


document.addEventListener("DOMContentLoaded", function() {
  console.log("loaded!");
  generate();
})
