# Guide de débogage pour WhatsApp Automation

Ce document fournit des instructions pour déboguer efficacement l'application WhatsApp Automation, qui se compose de deux parties principales :
1. Le serveur WhatsApp (Express.js)
2. L'application frontend (Next.js)

## Accès aux logs

### Page de logs intégrée

Une page de logs a été ajoutée à l'application pour faciliter le débogage. Vous pouvez y accéder à l'adresse suivante :

\`\`\`
http://localhost:3000/logs
\`\`\`

Cette page vous permet de :
- Voir l'état du serveur WhatsApp et de l'application Next.js
- Consulter les informations système (uptime, mémoire, espace disque)
- Télécharger les logs au format JSON
- Activer l'auto-refresh pour surveiller les logs en temps réel

### Logs du serveur WhatsApp

Les logs du serveur WhatsApp sont affichés dans le terminal où le serveur est exécuté. Pour voir ces logs :

1. Exécutez le serveur avec la commande suivante :
   \`\`\`bash
   cd /Users/sami/Journey/Dev/whatsapp-server
   node server.js
   \`\`\`

2. Les logs seront affichés dans le terminal.

### Logs de l'application Next.js

Les logs de l'application Next.js sont affichés dans le terminal où l'application est exécutée. Pour voir ces logs :

1. Exécutez l'application avec la commande suivante :
   \`\`\`bash
   cd /Users/sami/Journey/Dev/whatsappautomationV0
   npm run dev
   \`\`\`

2. Les logs seront affichés dans le terminal.

## Débogage avec VS Code

Un fichier de configuration de débogage a été ajouté pour faciliter le débogage avec VS Code. Pour l'utiliser :

1. Ouvrez le projet dans VS Code.
2. Cliquez sur l'icône "Run and Debug" dans la barre latérale (ou appuyez sur Ctrl+Shift+D).
3. Sélectionnez l'une des configurations de débogage suivantes :
   - **Next.js: debug server-side** : Débogue le côté serveur de l'application Next.js.
   - **Next.js: debug client-side** : Débogue le côté client de l'application Next.js.
   - **Next.js: debug full stack** : Débogue à la fois le côté serveur et le côté client de l'application Next.js.
   - **WhatsApp Server: debug** : Débogue le serveur WhatsApp.
   - **Debug Both** : Débogue à la fois le serveur WhatsApp et l'application Next.js.

4. Cliquez sur le bouton "Start Debugging" (ou appuyez sur F5).

### Utilisation des points d'arrêt

Pour utiliser des points d'arrêt :

1. Ouvrez le fichier que vous souhaitez déboguer.
2. Cliquez dans la marge à gauche de la ligne où vous souhaitez ajouter un point d'arrêt.
3. Démarrez le débogage.
4. L'exécution s'arrêtera au point d'arrêt, et vous pourrez inspecter les variables, exécuter du code dans la console de débogage, etc.

## Débogage avancé

### Débogage du serveur WhatsApp

Pour un débogage plus avancé du serveur WhatsApp, vous pouvez utiliser l'inspecteur Node.js :

\`\`\`bash
cd /Users/sami/Journey/Dev/whatsapp-server
node --inspect server.js
\`\`\`

Puis ouvrez Chrome et accédez à `chrome://inspect` pour connecter l'inspecteur.

### Débogage de l'application Next.js

Pour déboguer les API routes de Next.js, ajoutez des `console.log()` dans vos fichiers route.ts. Les logs seront affichés dans le terminal où l'application Next.js est exécutée.

Pour déboguer le frontend, utilisez les outils de développement du navigateur (F12 ou Ctrl+Shift+I).

## Conseils de débogage

- Utilisez `console.log()` pour afficher des informations de débogage.
- Utilisez les points d'arrêt pour suspendre l'exécution et inspecter les variables.
- Utilisez la page de logs pour surveiller l'état du système.
- Pour les problèmes liés à WhatsApp, vérifiez l'état de la connexion dans la page principale de l'application.
- Pour les problèmes liés à Supabase, vérifiez les logs d'erreur dans la console du navigateur et dans le terminal du serveur.
