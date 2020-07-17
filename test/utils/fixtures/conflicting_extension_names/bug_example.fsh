Extension:      FastqPaired
Id:             FastqPaired
Title:          "Fastq Paired"
Description:    "Represents paired read data generated from sequencing performed on this specimen."

* extension contains
    forward 1..1 MS and
    forwardByteSize 0..1

* extension[forward] ^short = "Forward read file location"
* extension[forward].value[x] only string

* extension[forwardByteSize] ^short = "Forward file size in bytes"
* extension[forwardByteSize].value[x] only decimal