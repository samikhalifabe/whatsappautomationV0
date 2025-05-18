-- Table pour stocker les modèles de messages
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'information',
  favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le timestamp updated_at
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insérer quelques modèles par défaut
INSERT INTO message_templates (name, content, category, favorite)
VALUES 
  ('Demande d''information véhicule', 'Bonjour, je suis intéressé par votre {{marque}} {{modele}} de {{annee}} à {{prix}}€. Est-elle toujours disponible ? Merci.', 'information', true),
  ('Demande de rendez-vous', 'Bonjour, je souhaiterais voir votre {{marque}} {{modele}} à {{prix}}€. Seriez-vous disponible pour une visite cette semaine ? Merci.', 'rendez-vous', false),
  ('Négociation prix', 'Bonjour, je suis intéressé par votre {{marque}} {{modele}} de {{annee}} avec {{kilometrage}} km. Seriez-vous ouvert à une offre de [VOTRE PRIX]€ ? Merci pour votre retour.', 'negociation', false),
  ('Demande d''informations techniques', 'Bonjour, concernant votre {{marque}} {{modele}} de {{annee}}, pourriez-vous me donner plus d''informations sur l''entretien et l''historique du véhicule ? Merci d''avance.', 'information', false),
  ('Demande avec lien de l''annonce', 'Bonjour, je suis intéressé par votre véhicule dans cette annonce: {{url}}. Pourriez-vous me donner plus d''informations ? Merci.', 'information', true)
ON CONFLICT (id) DO NOTHING;
