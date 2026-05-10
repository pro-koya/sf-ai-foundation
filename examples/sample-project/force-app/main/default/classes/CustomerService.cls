public with sharing class CustomerService {
    public static List<Customer__c> findGold() {
        return [SELECT Id, Name, Tier__c FROM Customer__c WHERE Tier__c = 'Gold'];
    }

    public static Decimal totalRevenue(Id customerId) {
        AggregateResult ar = [
            SELECT SUM(Total__c) total FROM Order__c WHERE Customer__c = :customerId
        ];
        return (Decimal) ar.get('total');
    }
}
