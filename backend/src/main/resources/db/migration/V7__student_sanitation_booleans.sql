-- Preserva as referências antigas para compatibilidade e histórico.
ALTER TABLE socioeconomic_profile
  ADD COLUMN has_water_supply BOOLEAN,
  ADD COLUMN has_sewage BOOLEAN,
  ADD COLUMN has_garbage_collection BOOLEAN;

-- Somente respostas inequívocas Sim/Não são convertidas; não se presume uma
-- resposta a partir de classificações antigas de abastecimento ou saneamento.
UPDATE socioeconomic_profile p
SET has_water_supply = CASE lower(trim(c.name)) WHEN 'sim' THEN TRUE WHEN 'não' THEN FALSE WHEN 'nao' THEN FALSE END
FROM catalog_item c WHERE c.id = p.water_supply_id;

UPDATE socioeconomic_profile p
SET has_sewage = CASE lower(trim(c.name)) WHEN 'sim' THEN TRUE WHEN 'não' THEN FALSE WHEN 'nao' THEN FALSE END
FROM catalog_item c WHERE c.id = p.sewage_id;

UPDATE socioeconomic_profile p
SET has_garbage_collection = CASE lower(trim(c.name)) WHEN 'sim' THEN TRUE WHEN 'não' THEN FALSE WHEN 'nao' THEN FALSE END
FROM catalog_item c WHERE c.id = p.garbage_collection_id;
