
const YEAR = 2025,
      passageCache = {}


export async function fetchPassages(division, translation) {
  const key = `${division.toLowerCase()}-${translation.toLowerCase()}`
  let passages = passageCache[key]
  if (passages === undefined) {
    passages = await (await fetch(`${YEAR}/${key}.json`, {method: 'GET'})).json()
    passageCache[key] = passages
  }
  return passages
}


export function choosePassages(passages, count, totalMinutes, targetWordsPerMinute) {
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
