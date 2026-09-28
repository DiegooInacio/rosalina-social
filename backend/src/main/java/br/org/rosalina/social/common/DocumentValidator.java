package br.org.rosalina.social.common;
public final class DocumentValidator {
 private DocumentValidator(){} public static boolean cpf(String value){ if(value==null||value.isBlank())return true; String s=value.replaceAll("\\D",""); if(s.length()!=11||s.chars().distinct().count()==1)return false; int a=0,b=0;for(int i=0;i<9;i++){int n=s.charAt(i)-'0';a+=n*(10-i);b+=n*(11-i);}int d1=(a*10)%11;d1=d1==10?0:d1;b+=d1*2;int d2=(b*10)%11;d2=d2==10?0:d2;return d1==s.charAt(9)-'0'&&d2==s.charAt(10)-'0'; }
}
