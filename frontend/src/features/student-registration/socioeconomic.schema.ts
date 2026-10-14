import { z } from 'zod'
import { optionalCatalogId, optionalMoney, toOptionalBoolean, toOptionalNumber, yesNoSchema } from '../../lib/form-fields'

export const socioeconomicSchema = z.object({
  housingTypeId: optionalCatalogId,
  acquisitionTypeId: optionalCatalogId,
  wallTypeId: optionalCatalogId,
  floorTypeId: optionalCatalogId,
  waterSupplyId: optionalCatalogId,
  sewageId: optionalCatalogId,
  garbageCollectionId: optionalCatalogId,
  hasElectricity: yesNoSchema,
  waterExpense: optionalMoney,
  electricityExpense: optionalMoney,
  phoneExpense: optionalMoney,
  rentOrFinancingExpense: optionalMoney,
  foodExpense: optionalMoney,
  householdIncome: optionalMoney,
  hasOtherAssets: yesNoSchema,
  hasOtherProperty: yesNoSchema,
  hasVehicle: yesNoSchema,
  receivesBolsaFamilia: yesNoSchema,
  receivesBpc: yesNoSchema,
  receivesRetirement: yesNoSchema,
}).superRefine((data, ctx) => {
  for (const field of ['hasOtherProperty', 'hasVehicle'] as const) {
    if (data[field] === 'true' && data.hasOtherAssets !== 'true') {
      ctx.addIssue({ code: 'custom', path: [field], message: 'Informe que possui outros bens patrimoniais.' })
    }
  }
})

export type SocioeconomicFormData = z.infer<typeof socioeconomicSchema>
export const socioeconomicDefaultValues: SocioeconomicFormData = {
  housingTypeId: '', acquisitionTypeId: '', wallTypeId: '', floorTypeId: '',
  waterSupplyId: '', sewageId: '', garbageCollectionId: '', hasElectricity: '',
  waterExpense: '', electricityExpense: '', phoneExpense: '', rentOrFinancingExpense: '',
  foodExpense: '', householdIncome: '', hasOtherAssets: '', hasOtherProperty: '', hasVehicle: '',
  receivesBolsaFamilia: '', receivesBpc: '', receivesRetirement: '',
}

export function toSocioeconomicRequest(data: SocioeconomicFormData) {
  if (Object.values(data).every((value) => value === '')) return undefined
  return {
    housingTypeId: data.housingTypeId || undefined,
    acquisitionTypeId: data.acquisitionTypeId || undefined,
    wallTypeId: data.wallTypeId || undefined,
    floorTypeId: data.floorTypeId || undefined,
    waterSupplyId: data.waterSupplyId || undefined,
    sewageId: data.sewageId || undefined,
    garbageCollectionId: data.garbageCollectionId || undefined,
    hasElectricity: toOptionalBoolean(data.hasElectricity),
    waterExpense: toOptionalNumber(data.waterExpense),
    electricityExpense: toOptionalNumber(data.electricityExpense),
    phoneExpense: toOptionalNumber(data.phoneExpense),
    rentOrFinancingExpense: toOptionalNumber(data.rentOrFinancingExpense),
    foodExpense: toOptionalNumber(data.foodExpense),
    householdIncome: toOptionalNumber(data.householdIncome),
    hasOtherAssets: toOptionalBoolean(data.hasOtherAssets),
    hasOtherProperty: data.hasOtherAssets === 'true' ? toOptionalBoolean(data.hasOtherProperty) : undefined,
    hasVehicle: data.hasOtherAssets === 'true' ? toOptionalBoolean(data.hasVehicle) : undefined,
    receivesBolsaFamilia: toOptionalBoolean(data.receivesBolsaFamilia),
    receivesBpc: toOptionalBoolean(data.receivesBpc),
    receivesRetirement: toOptionalBoolean(data.receivesRetirement),
  }
}
