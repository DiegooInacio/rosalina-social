package br.org.rosalina.social.student;
import br.org.rosalina.social.audit.AuditService; import br.org.rosalina.social.catalog.*; import br.org.rosalina.social.common.*; import java.util.*; import org.springframework.data.domain.*; import org.springframework.http.HttpStatus; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
@Service @Transactional public class StudentService {
 private final StudentRepository students; private final CatalogItemRepository catalogs; private final AuditService audit; public StudentService(StudentRepository s,CatalogItemRepository c,AuditService a){students=s;catalogs=c;audit=a;}
 public Student create(StudentController.Request r){validate(r,null);Student s=new Student();apply(s,r);students.save(s);audit.record("CREATE","STUDENT",s.getId());return s;}
 public Student update(UUID id,StudentController.Request r){Student s=students.findWithDetailsById(id).orElseThrow(()->new NotFoundException("Aluno não encontrado."));validate(r,id);apply(s,r);students.save(s);audit.record("UPDATE","STUDENT",id);return s;}
 public Student get(UUID id){return students.findWithDetailsById(id).orElseThrow(()->new NotFoundException("Aluno não encontrado."));}
 @Transactional(readOnly=true) public Page<Student> list(String name,String cpf,StudentStatus status,Pageable page){return students.search(blank(name),FieldValidation.cpf(cpf,"cpf"),status,page);}
 public Student setStatus(UUID id,StudentStatus status){Student s=students.findById(id).orElseThrow(()->new NotFoundException("Aluno não encontrado."));s.setStatus(status);students.save(s);audit.record(status==StudentStatus.ATIVO?"ACTIVATE":"DEACTIVATE","STUDENT",id);return s;}
 private void validate(StudentController.Request r,UUID existing){
  String cpf=FieldValidation.cpf(r.cpf(),"cpf");
  if(cpf!=null&&students.existsByCpf(cpf)&&(existing==null||!cpf.equals(students.findById(existing).map(Student::getCpf).orElse(null))))
   throw new ApiException(HttpStatus.CONFLICT,"CPF já cadastrado.",Map.of("cpf","CPF já cadastrado."));
  FieldValidation.notFuture(r.birthDate(),"birthDate"); FieldValidation.notFuture(r.startDate(),"startDate");
  FieldValidation.numeric(r.nis(),"nis",20); FieldValidation.numeric(r.nationalHealthCard(),"nationalHealthCard",20);
  FieldValidation.phone(r.guardianPhone(),"guardianPhone"); FieldValidation.phone(r.studentPhone(),"studentPhone"); FieldValidation.zipCode(r.zipCode(),"zipCode");
  var validation=new CatalogValidation(catalogs);
  validation.optional(r.activityId(),CatalogCategory.ATIVIDADE,"activityId");
  if(r.relatives()==null||r.relatives().stream().noneMatch(x->x!=null&&x.type()==RelativeType.RESPONSAVEL&&x.name()!=null&&!x.name().isBlank()))
   throw ApiException.field("relatives","Nome do responsável é obrigatório.");
  Set<RelativeType> types=new HashSet<>();
  for(int i=0;i<r.relatives().size();i++){
   var relative=r.relatives().get(i); String path="relatives["+i+"]";
   if(relative==null)throw ApiException.field(path,"Informe os dados do familiar.");
   if(!types.add(relative.type()))throw ApiException.field(path+".type","Cada tipo de familiar pode ser informado uma vez.");
   FieldValidation.cpf(relative.cpf(),path+".cpf"); FieldValidation.phone(relative.phone(),path+".phone");
   validation.optional(relative.occupationId(),CatalogCategory.OCUPACAO,path+".occupationId");
   validation.optional(relative.educationId(),CatalogCategory.ESCOLARIDADE,path+".educationId");
  }
  if(r.socioeconomic()!=null){
   var x=r.socioeconomic();
   validation.optional(x.housingTypeId(),CatalogCategory.TIPO_MORADIA,"socioeconomic.housingTypeId");
   validation.optional(x.acquisitionTypeId(),CatalogCategory.FORMA_AQUISICAO,"socioeconomic.acquisitionTypeId");
   validation.optional(x.wallTypeId(),CatalogCategory.TIPO_VEDACAO,"socioeconomic.wallTypeId");
   validation.optional(x.floorTypeId(),CatalogCategory.TIPO_PISO,"socioeconomic.floorTypeId");
   validation.optional(x.waterSupplyId(),CatalogCategory.AGUA,"socioeconomic.waterSupplyId");
   validation.optional(x.sewageId(),CatalogCategory.ESGOTO,"socioeconomic.sewageId");
   validation.optional(x.garbageCollectionId(),CatalogCategory.COLETA_LIXO,"socioeconomic.garbageCollectionId");
   if(!Boolean.TRUE.equals(x.hasOtherAssets())&&Boolean.TRUE.equals(x.hasOtherProperty()))throw ApiException.field("socioeconomic.hasOtherProperty","Informe patrimônio antes de marcar outro imóvel.");
   if(!Boolean.TRUE.equals(x.hasOtherAssets())&&Boolean.TRUE.equals(x.hasVehicle()))throw ApiException.field("socioeconomic.hasVehicle","Informe patrimônio antes de marcar veículo.");
  }
 }
 private void apply(Student s,StudentController.Request r){s.setStatus(r.status());s.setName(r.name().trim());s.setActivity(active(r.activityId(),CatalogCategory.ATIVIDADE));s.setBirthDate(r.birthDate());s.setRg(blank(r.rg()));s.setCpf(digits(r.cpf()));s.setCadunico(r.cadunico());s.setNis(digits(r.nis()));s.setNationalHealthCard(digits(r.nationalHealthCard()));s.setAddress(blank(r.address()));s.setNeighborhood(blank(r.neighborhood()));s.setReferencePoint(blank(r.referencePoint()));s.setCity(blank(r.city()));s.setZipCode(digits(r.zipCode()));s.setStartDate(r.startDate());s.setGuardianPhone(digits(r.guardianPhone()));s.setGuardianEmail(blank(r.guardianEmail()));s.setStudentPhone(digits(r.studentPhone()));s.setStudentEmail(blank(r.studentEmail()));s.setParentsRelationshipStatus(r.parentsRelationshipStatus());
 Map<RelativeType,StudentRelative> current=new HashMap<>();s.getRelatives().forEach(v->current.put(v.getType(),v)); List<StudentRelative> relatives=new ArrayList<>();if(r.relatives()!=null)for(var x:r.relatives()){StudentRelative p=current.getOrDefault(x.type(),new StudentRelative());p.setType(x.type());p.setKinship(blank(x.kinship()));p.setName(x.name().trim());p.setBirthDate(x.birthDate());p.setOccupation(optional(x.occupationId(),CatalogCategory.OCUPACAO));p.setLiterate(x.literate());p.setEducation(optional(x.educationId(),CatalogCategory.ESCOLARIDADE));p.setPhone(digits(x.phone()));p.setRg(blank(x.rg()));p.setCpf(digits(x.cpf()));p.setVoterRegistration(blank(x.voterRegistration()));relatives.add(p);}s.replaceRelatives(relatives); if(r.socioeconomic()!=null){SocioeconomicProfile p=s.getSocioeconomicProfile()==null?new SocioeconomicProfile():s.getSocioeconomicProfile();var x=r.socioeconomic();p.setHousingType(optional(x.housingTypeId(),CatalogCategory.TIPO_MORADIA));p.setAcquisitionType(optional(x.acquisitionTypeId(),CatalogCategory.FORMA_AQUISICAO));p.setWallType(optional(x.wallTypeId(),CatalogCategory.TIPO_VEDACAO));p.setFloorType(optional(x.floorTypeId(),CatalogCategory.TIPO_PISO));p.setHasElectricity(x.hasElectricity());p.setWaterSupply(optional(x.waterSupplyId(),CatalogCategory.AGUA));p.setSewage(optional(x.sewageId(),CatalogCategory.ESGOTO));p.setGarbageCollection(optional(x.garbageCollectionId(),CatalogCategory.COLETA_LIXO));p.setWaterExpense(x.waterExpense());p.setElectricityExpense(x.electricityExpense());p.setPhoneExpense(x.phoneExpense());p.setRentOrFinancingExpense(x.rentOrFinancingExpense());p.setFoodExpense(x.foodExpense());p.setHouseholdIncome(x.householdIncome());p.setHasOtherAssets(x.hasOtherAssets());p.setHasOtherProperty(x.hasOtherProperty());p.setHasVehicle(x.hasVehicle());p.setReceivesBolsaFamilia(x.receivesBolsaFamilia());p.setReceivesBpc(x.receivesBpc());p.setReceivesRetirement(x.receivesRetirement());s.setSocioeconomicProfile(p);}else s.setSocioeconomicProfile(null); }
 private CatalogItem active(UUID id,CatalogCategory category){CatalogItem item=catalogs.findById(id).orElseThrow(()->new NotFoundException("Catálogo não encontrado."));if(!item.isActive()||item.getCategory()!=category)throw new ApiException(HttpStatus.BAD_REQUEST,"Opção de catálogo inválida ou inativa.");return item;} private CatalogItem optional(UUID id,CatalogCategory category){return id==null?null:active(id,category);} private static String blank(String s){return s==null||s.isBlank()?null:s.trim();} private static String digits(String s){return s==null||s.isBlank()?null:s.replaceAll("\\D","");}
}
