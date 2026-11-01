import type { Field } from './record-display'

export const studentFields: Field[] = [
  ['name', 'Nome'], ['status', 'Situação'], ['activity', 'Atividade'], ['birthDate', 'Nascimento', 'date'],
  ['startDate', 'Data de início', 'date'], ['cpf', 'CPF', 'cpf'], ['rg', 'RG antigo'], ['nis', 'NIS'],
  ['nationalHealthCard', 'Cartão Nacional de Saúde'], ['cadunico', 'Cadastro Único'], ['parentsRelationshipStatus', 'Situação dos pais'],
]
export const studentAddress: Field[] = [['zipCode', 'CEP', 'cep'], ['address', 'Endereço'], ['neighborhood', 'Bairro'], ['city', 'Cidade'], ['referencePoint', 'Ponto de referência']]
export const studentContacts: Field[] = [['guardianPhone', 'Telefone de contato do responsável', 'phone'], ['guardianEmail', 'E-mail do responsável'], ['studentPhone', 'Telefone do aluno', 'phone'], ['studentEmail', 'E-mail do aluno']]
export const relativeFields: Field[] = [['name', 'Nome'], ['kinship', 'Grau de parentesco'], ['birthDate', 'Nascimento', 'date'], ['occupation', 'Ocupação'], ['literate', 'Sabe ler e escrever'], ['education', 'Escolaridade'], ['phone', 'Telefone', 'phone'], ['cpf', 'CPF', 'cpf'], ['rg', 'RG antigo'], ['voterRegistration', 'Título de eleitor']]
export const socioeconomicFields: Field[] = [
  ['housingType', 'Tipo de moradia'], ['acquisitionType', 'Forma de aquisição'], ['wallType', 'Vedação'], ['floorType', 'Piso'],
  ['hasElectricity', 'Energia elétrica'], ['hasWaterSupply', 'Água'], ['hasSewage', 'Esgoto'], ['hasGarbageCollection', 'Coleta de lixo'],
  ['waterSupply', 'Água (registro anterior)'], ['sewage', 'Esgoto (registro anterior)'], ['garbageCollection', 'Coleta de lixo (registro anterior)'],
  ['waterExpense', 'Gasto mensal com água', 'money'], ['electricityExpense', 'Gasto mensal com luz', 'money'], ['phoneExpense', 'Gasto mensal com telefone', 'money'],
  ['rentOrFinancingExpense', 'Aluguel ou financiamento mensal', 'money'], ['foodExpense', 'Gasto mensal com alimentação', 'money'], ['householdIncome', 'Renda familiar mensal', 'money'],
  ['hasOtherAssets', 'Outros bens patrimoniais'], ['hasOtherProperty', 'Outro imóvel'], ['hasVehicle', 'Veículo'], ['receivesBolsaFamilia', 'Bolsa Família'], ['receivesBpc', 'BPC'], ['receivesRetirement', 'Aposentadoria ou equivalente'],
]
export const responsibleFields: Field[] = [
  ['name', 'Nome'], ['socialName', 'Nome social'], ['birthDate', 'Nascimento', 'date'], ['age', 'Idade na data de referência'],
  ['birthSexId', 'Sexo atribuído ao nascimento', 'catalog'], ['racialIdentityId', 'Identificação racial', 'catalog'],
  ['genderIdentityId', 'Identificação de gênero', 'catalog'], ['sexualOrientationId', 'Orientação sexual', 'catalog'], ['maritalStatusId', 'Estado civil', 'catalog'],
  ['documentType', 'Tipo de documento'], ['documentNumber', 'Número do documento'], ['cpf', 'CPF', 'cpf'], ['phone', 'Telefone', 'phone'], ['email', 'E-mail'],
  ['birthplace', 'Naturalidade'], ['nationality', 'Nacionalidade'], ['nis', 'NIS'], ['educationId', 'Escolaridade', 'catalog'], ['schoolTypeId', 'Tipo de escola', 'catalog'], ['voterRegistration', 'Título de eleitor'],
]
export const surveyAddress: Field[] = [['zipCode', 'CEP', 'cep'], ['street', 'Rua'], ['number', 'Número'], ['complement', 'Complemento'], ['neighborhood', 'Bairro'], ['city', 'Cidade'], ['state', 'UF']]
export const housingFields: Field[] = [['type', 'Tipo de moradia'], ['roomCount', 'Quantidade de cômodos'], ['residentCount', 'Quantidade de moradores'], ['landlordName', 'Nome do proprietário'], ['landlordPhone', 'Telefone do proprietário', 'phone'], ['monthsInCommunity', 'Meses na comunidade'], ['monthsAtAddress', 'Meses no endereço'], ['pipedWater', 'Água encanada / CAGECE'], ['electricity', 'Energia elétrica'], ['sewage', 'Esgoto']]
export const workFields: Field[] = [['works', 'Trabalha'], ['occupation', 'Em que trabalha'], ['receivesBenefit', 'Recebe benefício'], ['benefit', 'Qual benefício'], ['minhaCasaMinhaVidaRegistered', 'Cadastro no Minha Casa, Minha Vida']]
export const healthFields: Field[] = [['hasDisability', 'Possui deficiência'], ['disabilityDescription', 'Descrição da deficiência'], ['continuousMedication', 'Uso contínuo de medicamentos'], ['medications', 'Medicamentos'], ['medicalCertificatePresented', 'Apresentou atestado médico'], ['allergies', 'Alergias']]
export const memberFields: Field[] = [['name', 'Nome'], ['isResponsible', 'Responsável familiar'], ['kinship', 'Parentesco'], ['birthDate', 'Nascimento', 'date'], ['age', 'Idade na data de referência'], ['documentType', 'Tipo de documento'], ['documentNumber', 'Número do documento'], ['income', 'Renda mensal', 'money']]
export const financialFields: Field[] = [['memberCount', 'Quantidade de integrantes'], ['incomeComplete', 'Renda de todos os integrantes informada'], ['totalIncome', 'Renda total', 'money'], ['perCapitaIncome', 'Renda por pessoa', 'money']]
export const authorizationFields: Field[] = [['imageAndSound', 'Uso de imagem e som', 'authorization'], ['personalData', 'Tratamento de dados pessoais', 'authorization']]
export const declarationFields: Field[] = [['location', 'Local'], ['date', 'Data', 'date'], ['responsibleSignatureName', 'Assinatura do responsável'], ['registrarSignatureName', 'Assinatura de quem cadastrou']]
export const metadataFields: Field[] = [['referenceDate', 'Data de referência', 'date'], ['status', 'Situação'], ['createdAt', 'Cadastro criado em', 'time'], ['updatedAt', 'Última atualização', 'time']]
