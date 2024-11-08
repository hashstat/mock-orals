
const YEAR = 2024,
      PASSAGE_COUNT = 12,
      RECITATION_MINUTES = 8,
      passageCache = {}


const DEFAULTS = Object.freeze({
  translation: 'nkjv',
  division: 'senior',
  speechRate: Object.freeze({
    'senior': 140,
    'junior': 130,
    'primary': 115,
  }),
  wordLimit: Object.freeze({
    'senior': 170,
    'junior': 160,
    'primary': 120,
  }),
  textSize: 'md',
  theme: 'auto',
})


function $(query, element=document) {
  const nodes = element.querySelectorAll(query)
  switch (nodes.length) {
    case 0:
      return undefined
    case 1:
      return nodes[0]
    default:
      return nodes
  }
}


async function generate() {
  console.log('generating passages')
  document.getElementById('passages').style.opacity = 0
  const translation = $('input[name="translation"]:checked').value,
      division = $('input[name="division"]:checked').value,
      speechRate = Number($('#speech-rate-range').value),
      wordLimit = Number($('#max-words-range').value)
  let passages = await fetchPassages(division, translation)
  passages = passages.filter(passage => (passage.word_count <= wordLimit))
  console.log(`${passages.length} passages remaining after filtering those with greater than ${wordLimit} words`)
  passages = await choosePassages(passages, PASSAGE_COUNT, RECITATION_MINUTES, speechRate)
  setPassages(passages)
  /* console.log(passages); */
}


async function fetchPassages(division, translation) {
  let passages = passageCache[division]
  if (passages === undefined) {
    passages = await (await fetch(`${YEAR}/${division.toLowerCase()}-${translation.toLowerCase()}.json`, {method: 'GET'})).json()
    passageCache[division] = passages
  }
  return passages
}


function choosePassages(passages, count, totalMinutes, targetWordsPerMinute) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const minRate = targetWordsPerMinute - 7.5,
            maxRate = targetWordsPerMinute + 7.5
      let attempt, words, wpm

      for (attempt = 0; attempt < 1000000; attempt++) {
        const picked = pick(passages, count)
        words = picked.reduce((total, p) => (total + p.word_count), 0)
        wpm = words / totalMinutes
        if (minRate <= wpm && wpm <= maxRate) {
          console.log(`${count} passages chosen: words = ${words}, wpm = ${wpm}`)
          resolve(picked)
          return
        }
      }
      reject('Maximum attempts reached. Please adjust parameters and try again.')
    }, 0)
  })
}


function pick(items, count) {
  const indices = Array.from(items, (_, i) => i),
    chosen = []
  while (indices.length && chosen.length < count) {
    const i = Math.floor(Math.random() * indices.length)
    chosen.push(items[indices.splice(i, 1)[0]])
  }
  return chosen
}


function setPassages(passages) {
  const node = document.createDocumentFragment()
  for (const [i, passage] of passages.entries()) {
    node.appendChild(passageCard(passage,i + 1))
  }
  for (const btn of node.querySelectorAll('button.btn-card-start-over')) {
    btn.addEventListener('click', startOverClicked)
  }
  for (const btn of node.querySelectorAll('button.btn-card-pass')) {
    btn.addEventListener('click', passClicked)
  }
  for (const btn of node.querySelectorAll('button.btn-card-complete')) {
    btn.addEventListener('click', completeClicked)
  }
  for (const words of node.querySelectorAll('div.card-body')) {
    words.addEventListener('click', wordClicked)
  }

  const div = document.getElementById('passages')
  div.replaceChildren(node)
  div.style.opacity = 1
}


function passageCard(passage, number) {
  /* Create card node by cloning the html template, then fill in fields. */
  const card = document.getElementById('verse-card-template').content.cloneNode(true)
  card.querySelector('.passage-number').textContent = number
  const node = card.querySelector('.division-passage')
  node.innerHTML = `${passage.division}&nbsp;&nbsp;•&nbsp;&nbsp;${passage.passage_number}`
  node.classList.add(`bg-${passage.division}`)
  card.querySelector('.card-title span').textContent = passage.reference
  card.querySelector('.card-subtitle span').textContent = passage.reference
  card.querySelector('.passage-stats').textContent = `${passage.cards.length} / ${passage.verse_count} / ${passage.word_count}`
  card.querySelector('.translation-release').innerHTML = `${passage.translation}&nbsp;&nbsp;•&nbsp;&nbsp;${passage.release}`

  /* Split card text and put each word in its own span, then add to card. */
  const spans = document.createDocumentFragment(),
        verseNumberRegex = /^\(\d+\)$/
  for (const [i, word] of passage.cards.join(' ').split(/(\s+)/).entries()) {
    if (i % 2) {
      spans.append(document.createTextNode(word))
    } else {
      const span = document.createElement('span')
      span.insertAdjacentText('afterbegin', word)
      if (verseNumberRegex.test(word)) {
        span.className = 'verse-number'
      }
      spans.appendChild(span)
    }
  }
  card.querySelector('.card-text').appendChild(spans)

  return card
}


function wordClicked(event) {
  console.log('word clicked', event)
  event.stopPropagation()
  if (event.target.nodeName !== 'SPAN') {
    return
  } if (event.target.classList.contains('verse-number')) {
    const method = event.target.classList.toggle('word-error') ? 'add' : 'remove'
    for (let node = event.target.nextElementSibling;
         node && !node.classList.contains('verse-number');
         node = node.nextElementSibling) {
      node.classList[method]('word-error')
    }
  } else {
    event.target.classList.toggle('word-error')
  }
}


function startOverClicked(event) {
  console.log('start over clicked', event)
  const card = event.target.closest('div.card')
  card.classList.remove('card-completed', 'card-passed')
  for (const node of card.querySelectorAll('span.word-warning')) {
    node.classList.remove('word-warning')
  }
  for (const node of card.querySelectorAll('span.word-error')) {
    node.classList.add('word-warning')
    node.classList.remove('word-error')
  }
}


function passClicked(event) {
  console.log('pass clicked', event)
  const card = event.target.closest('div.card')
  card.classList.add('card-passed')
  card.classList.remove('card-completed')
}


function completeClicked(event) {
  console.log('complete clicked', event)
  const card = event.target.closest('div.card')
  card.classList.add('card-completed')
  card.classList.remove('card-passed')
}


document.addEventListener("DOMContentLoaded", () => {
  const translation = $('#translation'),
      division = $('#division'),
      speechRateGroup = $('#speech-rate-group'),
      speechRates = Object.fromEntries(Object.entries(DEFAULTS.speechRate)),
      speechRateInput = $('#speech-rate'),
      speechRateRange = $('#speech-rate-range'),
      speechRateReset = $('#speech-rate-reset-button'),
      wordLimitGroup = $('#word-limit-group'),
      wordLimits = Object.fromEntries(Object.entries(DEFAULTS.wordLimit)),
      wordLimitInput = $('#max-words'),
      wordLimitRange = $('#max-words-range'),
      wordLimitReset = $('#max-words-reset-button'),
      textSize = $('#text-size'),
      hideVerseNumbers = $('#hide-verse-numbers'),
      hidePassageText = $('#hide-passage-text'),
      theme = $('#theme'),
      root = $(':root')

  division.addEventListener('input', () => {
    const value = $('input:checked', division).value,
        speechRate = speechRates[value],
        wordLimit = wordLimits[value]
    speechRateInput.placeholder = DEFAULTS.speechRate[value]
    speechRateInput.value = speechRateRange.value = speechRate
    speechRateReset.style.visibility = speechRateRange.value == speechRateInput.placeholder ? 'hidden' : 'visible'
    wordLimitInput.placeholder = DEFAULTS.wordLimit[value]
    wordLimitInput.value = wordLimitRange.value = wordLimit
    wordLimitReset.style.visibility = wordLimitRange.value == wordLimitInput.placeholder ? 'hidden' : 'visible'
  })


  /* Speech Rate events */
  speechRateGroup.addEventListener('input', () => {
    speechRateReset.style.visibility = speechRateRange.value == speechRateInput.placeholder ? 'hidden' : 'visible'
  })

  speechRateInput.addEventListener('input', event => {
    speechRateRange.value = event.target.value
  })

  speechRateGroup.addEventListener('change', event => {
    if (!event.target.value) {
      speechRateReset.dispatchEvent(new Event('click'))
    } else if (event.target.value != speechRateRange.value) {
      event.target.value = speechRateRange.value
    }
  })

  speechRateRange.addEventListener('input', event => {
    speechRateInput.value = event.target.value
  })

  speechRateReset.addEventListener('click', () => {
    speechRateInput.value = speechRateRange.value = speechRateInput.placeholder
    speechRateReset.style.visibility = 'hidden'
  })


  /* Word Limit events */
  wordLimitGroup.addEventListener('input', () => {
    wordLimitReset.style.visibility = wordLimitRange.value == wordLimitInput.placeholder ? 'hidden' : 'visible'
  })

  wordLimitInput.addEventListener('input', event => {
    wordLimitRange.value = event.target.value
  })

  wordLimitGroup.addEventListener('change', event => {
    if (!event.target.value) {
      wordLimitReset.dispatchEvent(new Event('click'))
    } else if (event.target.value != wordLimitRange.value) {
      event.target.value = wordLimitRange.value
    }
  })

  wordLimitRange.addEventListener('input', event => {
    wordLimitInput.value = event.target.value
  })

  wordLimitReset.addEventListener('click', () => {
    wordLimitInput.value = wordLimitRange.value = wordLimitInput.placeholder
    wordLimitReset.style.visibility = 'hidden'
  })


  /* Text events */
  textSize.addEventListener('input', (event) => {
    root.style.setProperty('--text-size', getComputedStyle(root).getPropertyValue(`--text-size-${event.target.value}`))
  })

  hideVerseNumbers.addEventListener('input', (event) => {
    hidePassageText.checked = false
    root.style.setProperty('--passage-text-display', 'block')
    root.style.setProperty('--verse-number-display', event.target.checked ? 'none': 'inline')
  })

  hidePassageText.addEventListener('input', (event) => {
    hideVerseNumbers.checked = false
    root.style.setProperty('--passage-text-display', event.target.checked ? 'none' : 'block')
    root.style.setProperty('--verse-number-display', 'inline')
  })

  document.getElementById('theme').addEventListener('input', (event) => {
    setTheme(event.target.value)
  })

  $('#settings').addEventListener('hide.bs.modal', () => {
    console.log('hide settings')
    let name
    localStorage.translation = $('input:checked', translation).value
    localStorage.division = name = $('input:checked', division).value
    speechRates[name] = Number(speechRateRange.value)
    localStorage[`speechRate.${name}`] = speechRateRange.value
    wordLimits[name] = Number(wordLimitRange.value)
    localStorage[`wordLimit.${name}`] = wordLimitRange.value
    localStorage.textSize = $('input:checked', textSize).value
    localStorage.hideVerseNumbers = hideVerseNumbers.checked
    localStorage.hidePassageText = hidePassageText.checked
    localStorage.theme = $('input:checked', theme).value
  })


  for (const [name, value] of Object.entries(speechRates)) {
    speechRates[name] = Number(localStorage[`speechRate.${name}`]) || value
  }
  for (const [name, value] of Object.entries(wordLimits)) {
    wordLimits[name] = Number(localStorage[`wordLimit.${name}`]) || value
  }
  $(`input[value="${localStorage.translation || DEFAULTS.translation}"]`, translation).checked = true
  $(`input[value="${localStorage.division || DEFAULTS.division}"]`, division).checked = true
  division.dispatchEvent(new Event('input'))
  $(`input[value="${localStorage.textSize || DEFAULTS.textSize}"]`, textSize).checked = true
  hideVerseNumbers.checked = localStorage.hideVerseNumbers === 'true'
  hidePassageText.checked = localStorage.hidePassageText === 'true'
  $(`input[value="${localStorage.theme || DEFAULTS.theme}"]`, theme).checked = true

  $('#generate-button').addEventListener('click', generate)
  $('#settings-button').click()
})


function setTheme(theme) {
  if (theme === 'auto') {
    document.documentElement.setAttribute('data-bs-theme',
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  } else {
    document.documentElement.setAttribute('data-bs-theme', theme)
  }
}

function preferredTheme() {
  let theme = localStorage.theme
  if (!theme || theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
}
