<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/app/Support/helpers.php';
require_once dirname(__DIR__) . '/app/Support/auth.php';
require_once dirname(__DIR__) . '/app/Repositories/PropertyRepository.php';
require_once dirname(__DIR__) . '/api/_listing-policy.php';

use App\Support\PropertyContact;
use App\Repositories\PropertyRepository;

$checks=0;
$check=static function(bool $ok,string $label)use(&$checks):void{if(!$ok)throw new RuntimeException($label);$checks++;};
$reject=static function(array $payload)use($check):void{
    try{PropertyContact::channels($payload,[],[]);}catch(InvalidArgumentException $expected){$check(true,'Invalid contact rejected.');return;}
    throw new RuntimeException('Invalid contact accepted.');
};
$extra=['+63 917 555 0100','(072) 700-1234'];
$links=[['label'=>'Facebook page','url'=>'https://www.facebook.com/example'],['label'=>'Website','url'=>'https://example.test/contact']];
$payload=['owner_additional_phones'=>json_encode($extra),'owner_social_links'=>json_encode($links)];
$contact=PropertyContact::channels($payload,[],[]);
$check($contact['additionalPhones']===$extra&&$contact['socialLinks']===$links,'Both channel lists retain their contents.');
$check(PropertyContact::channels([],[],$contact)===$contact,'Unrelated edits preserve existing channels.');
$check(PropertyContact::channels(['owner_additional_phones'=>'[]','owner_social_links'=>'[]'],[],$contact)===['additionalPhones'=>[],'socialLinks'=>[]],'Explicit clearing removes existing channels.');
$check(count(PropertyContact::channels(['owner_additional_phones'=>['+63 917 555 0100','+63-917-555-0100']],[],[])['additionalPhones'])===1,'Formatting-only phone duplicates collapse.');
$check(PropertyContact::channels($payload,['phone'=>'+63 917 555 0100'],[])['additionalPhones']===['(072) 700-1234'],'Additional numbers cannot duplicate the primary phone.');
$check(count(PropertyContact::channels(['owner_social_links'=>[$links[0],$links[0]]],[],[])['socialLinks'])===1,'Identical account links collapse.');
foreach(['javascript:alert(1)','data:text/html,test','https://name:secret@example.test','not a URL','ftp://example.test','//example.test','https://']as$url){$reject(['owner_social_links'=>[['label'=>'Account','url'=>$url]]]);}
foreach(['12','1234567890123456','<script>123456789</script>','1e1234567']as$phone){$reject(['owner_additional_phones'=>[$phone]]);}
$reject(['owner_social_links'=>[['label'=>'Missing URL','url'=>'']]]);
$reject(['owner_additional_phones'=>array_fill(0,5,'09175550100')]);
$reject(['owner_additional_phones'=>'not json']);
$reject(['owner_social_links'=>[['label'=>str_repeat('x',61),'url'=>'https://example.test']]]);
$actor=['id'=>999000001,'role'=>'seller','name'=>'Synthetic broker','email'=>'broker@example.test','identityVerificationStatus'=>'verified'];
$filtered=sfc_listing_payload($payload,$actor,true);
$check(isset($filtered['owner_additional_phones'],$filtered['owner_social_links']),'Broker policy retains reported contact channels.');
$repository=new PropertyRepository(new class extends PDO{public function __construct(){}});
$normalize=new ReflectionMethod($repository,'normalizeOwnerContact');$normalize->setAccessible(true);
$stored=$normalize->invoke($repository,$filtered+['owner_name'=>'Contact name','owner_phone'=>'09170001111'],[],'Synthetic property');
$check($stored['additionalPhones']===$extra&&$stored['socialLinks']===$links,'Repository writes contacts into the existing contact JSON.');
$check($normalize->invoke($repository,['owner_name'=>'Changed name'],$stored,'Synthetic property')['socialLinks']===$links,'Editing a different contact field preserves account links.');
echo "Property contact: {$checks} persistence, clearing, deduplication, URL and phone validation checks passed; no database writes.\n";
