# A Bunch of useful Scripts

Snapshot address from browser:

```js
let addresses = []

addresses = addresses.concat(
  [...document.body.innerHTML.matchAll(/erd1[a-z0-9]{58}/g)].flat().filter(value => addresses.indexOf(value) === -1)
)

JSON.stringify(addresses)
```
