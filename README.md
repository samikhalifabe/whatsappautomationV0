# WhatsApp Automation avec Supabase

Cette application permet d'automatiser l'envoi de messages WhatsApp et de gérer les contacts et véhicules via une base de données Supabase.

## Fonctionnalités

- **Connexion WhatsApp** : Connectez-vous à WhatsApp Web via un QR code
- **Envoi de messages** : Envoyez des messages WhatsApp individuels ou en masse
- **Gestion des véhicules** : Consultez et gérez les véhicules stockés dans Supabase
- **Gestion des contacts** : Gérez les contacts associés aux véhicules
- **Historique des contacts** : Suivez l'historique des interactions avec les contacts

## Architecture technique

L'application est construite avec les technologies suivantes :

- **Frontend** : Next.js, React, TypeScript, Tailwind CSS
- **Backend** : API Routes Next.js, WhatsApp Web JS
- **Base de données** : Supabase (PostgreSQL)

## Structure de la base de données

La base de données Supabase contient les tables suivantes :

### Vehicles

Table qui stocke les informations sur les véhicules :

- `id` : Identifiant unique (UUID)
- `brand` : Marque du véhicule
- `model` : Modèle du véhicule
- `price` : Prix du véhicule
- `year` : Année du véhicule
- `mileage` : Kilométrage
- `fuel_type` : Type de carburant
- `transmission` : Type de transmission
- `power` : Puissance (optionnel)
- `location` : Localisation du véhicule
- `listing_url` : URL de l'annonce
- `phone` : Numéro de téléphone du vendeur
- `image_url` : URL de l'image (optionnel)
- `created_at` : Date de création
- `updated_at` : Date de mise à jour
- `user_id` : ID de l'utilisateur propriétaire

### Conversations

Table qui stocke les conversations WhatsApp :

- `id` : Identifiant unique (UUID)
- `vehicle_id` : Référence au véhicule (clé étrangère, optionnel)
- `phone_number` : Numéro de téléphone du contact
- `chat_id` : Identifiant du chat WhatsApp (optionnel)
- `status` : Statut de la conversation (ex: "active", "archived", etc.)
- `last_message_at` : Date du dernier message
- `created_at` : Date de création
- `updated_at` : Date de mise à jour
- `user_id` : ID de l'utilisateur propriétaire

### Messages

Table qui stocke les messages WhatsApp :

- `id` : Identifiant unique (UUID)
- `conversation_id` : Référence à la conversation (clé étrangère)
- `body` : Contenu du message
- `is_from_me` : Indique si le message a été envoyé par l'utilisateur
- `message_id` : Identifiant du message WhatsApp (optionnel)
- `timestamp` : Date et heure du message
- `created_at` : Date de création
- `user_id` : ID de l'utilisateur propriétaire

### Contact Records

Table qui stocke les contacts associés aux véhicules :

- `id` : Identifiant unique (UUID)
- `vehicle_id` : Référence au véhicule (clé étrangère)
- `first_contact_date` : Date du premier contact
- `latest_contact_date` : Date du dernier contact
- `status` : Statut du contact (ex: "Nouveau", "Contacté", etc.)
- `favorite_rating` : Note de favoris (optionnel)
- `price_offered` : Prix proposé (optionnel)
- `target_price` : Prix cible (optionnel)
- `notes` : Notes sur le contact (optionnel)
- `created_at` : Date de création
- `updated_at` : Date de mise à jour
- `user_id` : ID de l'utilisateur propriétaire

### Contact History

Table qui stocke l'historique des interactions avec les contacts :

- `id` : Identifiant unique (UUID)
- `contact_record_id` : Référence au contact (clé étrangère)
- `contact_date` : Date du contact
- `contact_type` : Type de contact (ex: "WhatsApp", "Téléphone", etc.)
- `notes` : Contenu du message ou notes (optionnel)
- `created_at` : Date de création
- `user_id` : ID de l'utilisateur propriétaire

## Intégration avec WhatsApp

L'application utilise la bibliothèque `whatsapp-web.js` pour interagir avec WhatsApp Web. Le processus est le suivant :

1. L'utilisateur scanne un QR code pour se connecter à WhatsApp Web
2. L'application peut alors envoyer des messages via l'API WhatsApp
3. Les messages envoyés sont enregistrés dans l'historique des contacts

## Utilisation

### Gestion des véhicules

L'onglet "Véhicules" permet de :

- Voir la liste des véhicules stockés dans Supabase
- Rechercher des véhicules par marque, modèle, etc.
- Contacter le vendeur d'un véhicule via WhatsApp
- Voir l'historique des contacts pour un véhicule

### Envoi de messages

L'application propose deux modes d'envoi de messages :

- **Envoi simple** : Envoi d'un message à un numéro spécifique
- **Envoi multiple** : Envoi de messages à plusieurs contacts avec des délais

### Gestion des conversations

L'application offre deux vues pour les conversations WhatsApp :

- **Conversations WhatsApp Live** : Affiche les conversations récupérées directement depuis WhatsApp Web
- **Conversations enregistrées** : Affiche les conversations stockées dans la base de données Supabase

La page "Conversations enregistrées" (accessible via `/db-conversations`) permet de :

- Voir toutes les conversations WhatsApp stockées dans la base de données
- Consulter l'historique complet des messages pour chaque conversation
- Envoyer de nouveaux messages directement depuis l'interface
- Voir les détails du véhicule associé à la conversation

Les conversations sont automatiquement enregistrées dans la base de données lorsque :

1. Un message est reçu via WhatsApp
2. Un message est envoyé via l'application
3. Une conversation est détectée lors de la connexion à WhatsApp Web

Le système associe automatiquement les conversations aux véhicules en fonction du numéro de téléphone.

## Configuration

Pour configurer l'application, vous devez :

1. Créer un projet Supabase et configurer les tables nécessaires
2. Ajouter les informations de connexion Supabase dans le fichier `lib/supabase.ts`
3. Démarrer le serveur WhatsApp local sur le port 3001

## Développement

Pour lancer l'application en mode développement :

```bash
npm run dev
```

L'application sera disponible sur http://localhost:3000
