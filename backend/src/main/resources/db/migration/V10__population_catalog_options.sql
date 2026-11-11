-- Approved survey choices. Preserve existing IDs, names and inactive items.
INSERT INTO catalog_item (category, name)
SELECT choices.category, choices.name
FROM (VALUES
  ('SEXO_NASCIMENTO', 'Feminino'),
  ('SEXO_NASCIMENTO', 'Masculino'),
  ('SEXO_NASCIMENTO', 'Prefere não informar'),
  ('SEXO_NASCIMENTO', 'Não informado'),
  ('IDENTIFICACAO_RACIAL', 'Branca'),
  ('IDENTIFICACAO_RACIAL', 'Preta'),
  ('IDENTIFICACAO_RACIAL', 'Parda'),
  ('IDENTIFICACAO_RACIAL', 'Amarela'),
  ('IDENTIFICACAO_RACIAL', 'Indígena'),
  ('IDENTIFICACAO_RACIAL', 'Prefere não informar'),
  ('IDENTIFICACAO_RACIAL', 'Não informado'),
  ('GENERO', 'Mulher cisgênero'),
  ('GENERO', 'Homem cisgênero'),
  ('GENERO', 'Mulher transgênero'),
  ('GENERO', 'Homem transgênero'),
  ('GENERO', 'Travesti'),
  ('GENERO', 'Pessoa não binária'),
  ('GENERO', 'Outra identidade de gênero'),
  ('GENERO', 'Prefere não informar'),
  ('GENERO', 'Não informado'),
  ('ORIENTACAO_SEXUAL', 'Heterossexual'),
  ('ORIENTACAO_SEXUAL', 'Gay'),
  ('ORIENTACAO_SEXUAL', 'Lésbica'),
  ('ORIENTACAO_SEXUAL', 'Bissexual'),
  ('ORIENTACAO_SEXUAL', 'Pansexual'),
  ('ORIENTACAO_SEXUAL', 'Assexual'),
  ('ORIENTACAO_SEXUAL', 'Outra orientação sexual'),
  ('ORIENTACAO_SEXUAL', 'Prefere não informar'),
  ('ORIENTACAO_SEXUAL', 'Não informado'),
  ('ESTADO_CIVIL', 'Solteiro(a)'),
  ('ESTADO_CIVIL', 'Casado(a)'),
  ('ESTADO_CIVIL', 'Separado(a) judicialmente'),
  ('ESTADO_CIVIL', 'Divorciado(a)'),
  ('ESTADO_CIVIL', 'Viúvo(a)'),
  ('ESTADO_CIVIL', 'União estável'),
  ('ESTADO_CIVIL', 'Não informado'),
  ('TIPO_ESCOLA', 'Pública municipal'),
  ('TIPO_ESCOLA', 'Pública estadual'),
  ('TIPO_ESCOLA', 'Pública federal'),
  ('TIPO_ESCOLA', 'Privada/particular'),
  ('TIPO_ESCOLA', 'Não informado')
) AS choices(category, name)
WHERE NOT EXISTS (
  SELECT 1 FROM catalog_item existing
  WHERE existing.category = choices.category
    AND lower(btrim(existing.name)) = lower(choices.name)
)
ON CONFLICT (category, name) DO NOTHING;
