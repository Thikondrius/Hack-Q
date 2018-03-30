# Hack-Q
## Démarrer le projet
```npm install nodemon -g```

```npm install```

```npm start ```

Le projet utilise nodemon (Dès que du code change le fichier de votre choix est recompilé)
et babel ( donc accès aux fonctionnalités es6 )

Le fichier trainedata sert à tesseract pour la reconnaissance de texte anglais

Dans package.json c'est cette ligne qui indique le fichier à compiler en utilisant nodemon et es6

```start": "nodemon --exec babel-node --presets es2015 index.js"```

