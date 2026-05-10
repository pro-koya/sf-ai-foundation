trigger OrderTrigger on Order__c (before insert, before update) {
    for (Order__c o : Trigger.new) {
        if (o.Total__c == null) {
            o.Total__c = 0;
        }
    }
}
