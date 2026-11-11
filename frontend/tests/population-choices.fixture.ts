import { fireEvent } from '@testing-library/react'
export const classificationFields = ['birthSexId', 'racialIdentityId', 'genderIdentityId', 'sexualOrientationId', 'maritalStatusId', 'schoolTypeId'] as const
export function selectPopulationChoices() {
  for (const field of classificationFields) {
    const select = document.getElementById(field)
    if (select) fireEvent.change(select, { target: { value: '00000000-0000-4000-8000-000000000001' } })
  }
}
